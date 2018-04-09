# TRANSLATE HTML TO JSON:
The HTML should contain only one root that becomes the root of the JSON.
An HTML node is translated into a standard JS object:
```JSON
{
    name: "", //@string - the node name
    "value": "" //@string - the content of the node,
    "attributes": { //@Object - an object(map) of the attributes of the node
        "attributName": "attributeValue",
        ...
    },
    "children": [] //@Array - A list of the children of the node
}
```

EXAMPLE IN HTML:
------------------

```HTML
<div id="_id" name="_name" data="_data">
    <img src="_src"/>
    <container>
        <text>HELLO</text>
        <circle radius="2"></circle>
    </container>
    <cont>TEXT</cont>
</div>
```

EXAMPLE TRANSLATED TO JSON:
---------------------------

```JSON
{
    "name": "div",
    "attributes": {
        "id": "_id",
        "name": "_name",
        "data": "_data"
    },
    "value": "",
    "children": [
        {
            "name": "img",
            "attributes": {
                "src": "_src"
            },
            "value": "",
            "children": []
        },
        {
            "name": "container",
            "attributes": {},
            "value": "",
            "children": [
                            {
                                "name": "text",
                                "attributes": {},
                                "value": "HELLO",
                                "children": []
                            },
                            {
                                "name": "circle",
                                "attributes": {
                                    "radius": "2"
                                },
                                "value": "",
                                "children": []
                            }
                        ]
        },
        {
            "name": "cont",
            "attributes": {},
            "value": "TEXT",
            "children": []
        }
    ]
}
```
