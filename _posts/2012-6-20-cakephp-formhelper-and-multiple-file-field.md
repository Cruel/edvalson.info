---
title: CakePHP FormHelper and the Multiple File Field
author: Thomas Edvalson
image: /assets/imgs/post_thumbs/cakephp.png
layout: post
description: Test description 2.
keywords: word1, word2
---

I’m using CakePHP 2.1.3 and was wanting to use the FormHelper to create a field that would properly upload multiple files. (Yes, I’m braving it without an upload plugin since it’s overkill in my case)

Firstly, I had to create a proper form allow for file uploading:

```php?start_inline=true
echo $this->Form->create('Scan', array('type' => 'file'));
```

Then I added a file field with the “multiple” attribute:

```php?start_inline=true
echo $this->Form->file('file', array('multiple'));
```

This appeared to work nicely, except then I notice that it was only uploaded the first of the files selected. So I look at the HTML as saw that the above file field was generated as such:

```php?start_inline=true
<input type="file" name="data[Scan][file]"  multiple="multiple" id="ScanFile"/>
```

“Scan” is, of course, the name of my particular model. The problem with this HTML is the name attribute which should read `data[Scan][file][]` (with the `[]` at the end). This would allow for proper multifile uploading. I looked around and couldn’t find any proper solution, so I naturally went to an improper solution:

```php?start_inline=true
echo $this->Form->file('file', array('name'=>'data[Scan][file][]', 'multiple'));
```

This, obviously, manually sets the name attribute to what it should be. Though I am looking for a current bug ticket (or otherwise will create one myself) since it should append `[]` to the name automatically if you use “multiple” attribute.
