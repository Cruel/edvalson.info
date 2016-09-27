---
title: Overriding a Django App Model
author: Thomas Edvalson
image: /assets/imgs/post_thumbs/django.png
layout: post
description: Test description 2.
keywords: word1, word2
---

Using [django-tagging](https://code.google.com/p/django-tagging/) as an example, I had a question about overriding a class in an app. This question I ended up posting [on StackOverflow](https://stackoverflow.com/questions/9562929/django-extending-an-apps-model-to-override-its-manager) too. My problem was that I wanted to override a Tag model’s manager. Now, this is easily achieved by extending the model class to create a [proxy model](https://docs.djangoproject.com/en/dev/topics/db/models/#proxy-model-managers):

```python
class MyTag(Tag):
    objects = MyTagManager()
    class Meta:
        proxy = True
```

But by using a proxy model, I would only be able to utilize MyTagManager when using MyTag. Therefore, any Tag usage found in the the django-tagging code will not be using my custom manager. I wanted true overriding power without having to change the app’s code itself.

My first instinct was to use [monkey-patching](https://en.wikipedia.org/wiki/Monkey_patch) on the class. So I tried both of the following:

```python
Tag.objects = MyTagManager
# OR
Tag.objects = MyTagManager()
```

Long story made short: neither line works. I did extensive debugging and it apparently doesn’t initialize the class correctly with the custom manager class. So then I went to monkey-patch the Tag class using the proper namespace:

```python
tagging.models.Tag = MyTag
```

I stepped through the code and inspected the object references using this code. It seemed to properly reference MyTag inside tagging/models.py itself when I manipulated Tag objects, but when Tag objects were manipulated within other django-tagging files such as tagging/fields.py then it ended up reverting back to the original Tag model. This seems very odd to me, but I didn’t really care to investigate to find the reasoning behind it. Seems like a bug, but for all I know there could be a valid reason for it in the django framework.

Monkey-patching is clearly a hack and it highly criticized for creating confusing code with inconsistencies (such as the inconsistency I just mentioned which changed the Tag model depending on where in your code you accessed it). But this was the easiest solution I could find: simple patch all app files that use the model with your extended model class. This was the full code:

```python
import tagging

class MyTagManager(TagManager):
    # Override update_tags()
    def update_tags(self, obj, tag_names):
        # My actions
        return super(MyTagManager, self).update_tags(obj, tag_names)

class MyTag(Tag):
    objects = MyTagManager()
    class Meta:
        proxy = True

tagging.models.Tag = MyTag
tagging.fields.Tag = MyTag
```

The last two lines are the keys, the monkey-patches. To do the same with other classes, you need to merely look at which files use the class in question, then monkey-patch all those file namespaces. Luckily, only models.py and fields.py were needed in my solution.
