---
title: Test Post
author: Thomas Edvalson
image: /assets/imgs/knocking-on-door.jpg
permalink: /test-post/
layout: post
description: Test description.
keywords: word1, word2
---

#### Test

{% highlight python %}
def save(self, path = "images"):
	if not os.path.exists(path):
		os.makedirs(path)
	for i, img in enumerate(self.image_array):
		img.save(os.path.join(path, "icons{}.png".format(i)), optimize=True)
		img.save(os.path.join(path, "icons{}.jpg".format(i)), quality=85, optimize=True)
{% endhighlight %}

Test *test*
