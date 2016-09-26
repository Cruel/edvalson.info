---
title: Using Gearman in CakePHP
author: Thomas Edvalson
image: /assets/imgs/knocking-on-door.jpg
permalink: /using-gearman-in-cakephp/
layout: post
description: Test description.
keywords: php, cakephp, gearman
---

## Intro

If you’re reading this, I’m assuming that you’re currently using [CakePHP](http://cakephp.org/) and wanting to implement [Gearman](http://gearman.org/) in your project. If you don’t use CakePHP, the concepts outlined here can still be useful, but the coding itself will be useless. If you use CakePHP and are clueless about Gearman and whether or not you want to use it, then you’re still in the right place.

## The Problem

I will illustrate a problem that existed in LyricJam, a lyric website, while I worked on it in the early stages. Similar problems exist in nearly all sizable web projects.

The LyricJam homepage consists of *Hot Artists* and *Top Tracks* and other such data. This data is fetched with multiple API calls and lots of SQL work. While the code could have probably been optimized better, there was no getting around it, the code was going to take a long time to execute. But that’s why we have this magical thing called *caching* so it only has to be done once! Ah ha! Problem solved!

```php
$songs = Cache::read('hot_songs', 'hourly');
if ($songs !== false) // If cache isn't expired
    return $songs;
$songs = lengthy_operation_func(); // Takes a while to load (30 seconds!)
Cache::write('hot_songs', $songs, 'hourly');
return $songs;
```
{: .code-block}

But wait. When the cache expires and it’s time to do work again, then page will still take a long time to load. As a matter of fact, LyricJam homepage took around 30 seconds to load for whomever was the first person of every hour to visit the site (the cache expired hourly). This clearly wasn’t desirable. What we needed was to do the caching work in the background as to not interrupt the website flow, yet the website flow still needed to trigger the caching. **Gearman to the rescue!**

## The Solution (concept)

If you know anything about Gearman, you know it’s one of [many solutions](https://en.wikipedia.org/wiki/Message-oriented_middleware) to this problem. From my limited research, it seems like one of the simplest for a PHP environment. In a python environment, I would recommend RabbitMQ with Celery task queue, and I’m sure other software may be better suited for other environments. Not to imply that Gearman can’t be used with Python and other coding environments, it certainly can, but bindings and libraries for some environments aren’t always as mature as others.

Gearman provides a framework for you to queue tasks and execute your code in the background. There are other features such task queues can serve, but running background tasks is the solution to the problem we’re discussing. So, like the code snippet above, we can now check for the cache, and if it’s expired, we will queue up a Gearman job to go update the cache without making the user wait for it.

But wait! If the cache is expired and the Gearman task is pushed into the background, then what information is returned to the user? Well, with only the hourly cache system, there would be nothing to return since it would be expired and the Gearman job has yet to update it. That’s why we’ll need —*gasp*— a second cache.

Here’s a fancy diagram that’s hopefully not too confusing:

{:.text-center}
![Libertarian Freedom](/assets/imgs/gearman.svg)

The **Primary Cache** is our hourly cache from the previous code snippet.

The **Secondary Cache** is a semi-permanent cache. It never expires, but can be manually invalidated or updated as necessary. It should **always** have the same content as the Primary Cache. It is meant to act as a backup for when the Primary Cache has expired.

The **Gearman Worker** runs in the background. So for the purpose of the flowchart/activity diagram, it happens “instantly” (deferring to the background task) and thus solves the problem of our 30-second page load-time. The blue arrows indicate that the background task updates both cache system at the same time with the most current data.

Time to update our previous example code to use Gearman with this secondary cache:

```php
function bg_func(){
    $songs = lengthy_operation_func(); // The 30-second operation
    Cache::write('hot_songs', $songs, 'hourly');
    Cache::write('hot_songs', $songs, 'permanent'); // Our secondary cache
}

$songs = Cache::read('hot_songs', 'hourly');
if ($songs !== false) // If cache isn't expired
    return $songs;
gearman_run('bg_func'); // Run bg_func() in background using Gearman
$songs = Cache::read('hot_songs', 'permanent');
return $songs;
```
{: .code-block}

This is oversimplified *semi-pseudo*-cakephp code, if that wasn’t clear. Actual code is in next section.

Using this method, we don’t have to worry about the Primary Cache being expired and returning nothing because the Secondary Cache will be there to fetch that which was expired. This way the client receives outdated information while the information is updated by the Gearman Worker. Outdated information is almost always better than a slow website.

The function call `gearman_run('bg_func');` is executed immediately without actually waiting for `bg_func()` to finish, queuing up the lengthy task to be executed later by Gearman.

## The Solution (actual code)

The above is nice and all, but How do I use Gearman in the CakePHP framework?!

Well, if you search for CakePHP and Gearman in the same phrase, you’re likely to to be led to this CakePHP plugin. This is more than enough and saves us the work of some boilerplate coding, so everyone say thanks to the author José Lorenzo Rodríguez. I won’t explain how to install a CakePHP plugin, that’s best done elsewhere, though I would suggest taking advantage of the fact that the git repo is compatible with Composer.

Now, assuming the cakephp-gearman plugin is now installed, we can get started. And I will assume that you have gone ahead and read about the basics of Gearman and how it works. Basically, there’s the Gearman Job Server daemon (gearmand) that is independent from our code. And our code will be using Gearman’s PECL extension to create a Gearman Worker process (also running as a daemon). It is only after these two processes are running that we can run the above pseudo-code snippet and start running our code in the background via Gearman.

```php
public function getHot($limit = 50, $cached = true) {
    if ($cached) {
        $songs = Cache::read('hot_songs_'.$limit, 'hourly');
        if ($songs !== false)
            return $songs;
        GearmanQueue::execute('getHotSongs', $limit);
        $songs = Cache::read('hot_songs_'.$limit, 'longterm');
        if ($songs !== false)
            return $songs;
        // Empty page until gearman proceses the above task
        return array();
    }

    // This is the process that took 30 seconds to assign $songs
    $song = lengthy_operation();

    Cache::write('hot_songs_'.$limit, $songs, 'hourly');
    Cache::write('hot_songs_'.$limit, $songs, 'longterm');
    return $songs;
}
```
{: .code-block}

Our Gearman Worker process needs to interface with our CakePHP application, so we will make a console task in [app]/Console/Command/Task/SongShell.php.

```php
App::uses('GearmanQueue', 'Gearman.Client');

class SongShell extends AppShell {

    public $uses = array('Song'); // Uses our Song model

    public $tasks = array('Gearman.GearmanWorker');

    // Method signature for GearmanWorker function
    public function getHotSongs($data, $job) {
        // Check cache to prevent multiple identical queued jobs from running consecutively
        if (Cache::read('hot_songs_'.$data, 'hourly') === false)
            return $this->Song->getHot($data);
        return false;
    }

    public function start_cache_worker() {
        $this->GearmanWorker->addFunction('getHotSongs', $this, 'getHotSongs');
        $this->GearmanWorker->work();
    }
}
```
{: .code-block}

Since it’s a long-term cache that won’t be accessed very often, it shouldn’t be used on any sort of RAM-based cache solution (like memcached) and instead should use a less-expensive method like file storage (in CakePHP, this will be FileEngine).
