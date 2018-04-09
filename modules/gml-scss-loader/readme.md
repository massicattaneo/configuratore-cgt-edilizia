# TRANSLATE SCSS TO JSON:
The output is a JS object containing properties (each one represents the ids) 
built in this way: 
NB:
1. "left" and "top" are translated into "x" and "y"
2. the units expressed in pixels (px) are transalted into numbers. (12px => 12)

```JSON
{
    "rules": {
            "radius": 10, //10px
            "borderWidth": 1, //1px
            "borderColor": "#33FFAA"
    },
    "modes": {
        "portrait": {
            "radius": 10, //10px
            "x": 40, //left
            "y": 20 //top
        }
    }    
}
```

EXAMPLE IN SCSS:
------------------

```SCSS
#container {
    width: 2px;
    height: 10px;
    background-color: red;
}

#circle {
    radius: 10px;
    border-width: 1px;
    border-color: #33FFAA;
}

.portrait #circle {
    radius: 10px;
    left: 40px;
    top: 20px;
}
```

EXAMPLE TRANSLATED TO JSON:
---------------------------

```JSON
{
    "container": {
        "modes": {},
        "rules": {
            "width": 2,
            "height": 10,
            "backgroundColor": "red"
        }
    },
    "circle": {
        "modes": {
            "portrait": {
                "radius": 10,
                "x": 40,
                "y": 20
            }
        },
        "rules": {
            "radius": 10,
            "borderWidth": 1,
            "borderColor": "#33FFAA"
        }
    }
}

```
