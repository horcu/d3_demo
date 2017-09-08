var width = 1360,
    height = 700,
    root,
    linkColor = '#444444',
    rootBranches = [],
    selectedNode = {},
    optArray = [],
    searchBy ="name",
    clusterOn = false,
    labelsOn = getLocal('toggle-labels') || true,
    linksOn = getLocal('toggle-links') || true,
    linksCheckbox = $('#show-link-cb'),

    labelsCheckbox = $('#show-label-cb'),
    selectedNodeColor = "#3c10bd",
    colors = ["#dbdbdb", "#4d6cbd", "#b141bd", "#bd7338", "#28bd5c", "#bbbd0a", "#8c564b", "#3c10bd", "#bd0f34", "#5B6CBD", "#17becf"],
    colorMapping = {
        1: "#bcbd22",
        2: "#4d6cbd",
        3: "#CE561A",
        4: "#b141bd",
    },
    popupInfoDiv = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0),
    currentBranch = {};
currentBranch.nodes = [];
currentBranch.links = [];

//set defaults
linksCheckbox.attr('checked', linksOn ? 'checked' : true);
labelsCheckbox.attr('checked', labelsOn ? 'checked' : true);

var force = d3.layout.force()
    .gravity(.15)
    .friction(.9)
    .linkStrength(.2)
    .charge(-455)
    .size([width, height])
    .on("tick", tick),

    w = window.innerWidth - 20,
    h = window.innerHeight - 120,

    svg = d3.select("body").select("svg")
    .attr("width", w)
    .attr("height", h)
        .style('margin-top', '100px')
    .attr("preserveAspectRatio", "xMinYMin meet")
    //.attr("viewBox", "0 0 600 400")
    //class to make it responsive
    .classed("svg-content-responsive", true),
    pattern_def = svg.append("defs"),

    link = svg.selectAll(".links"),
    node = svg.selectAll(".nodes"),
    label = svg.selectAll(".labels");


linksCheckbox.on('click', function () {
    if($(this).is(':checked')){
        toggleLinks(true);
        saveLocal('toggle-links', true);
    }else{
        toggleLinks(false);
        saveLocal('toggle-links', false);
    }
});

labelsCheckbox.on('click', function () {
    if($(this).is(':checked')){
        toggleLabels(true);
        saveLocal('toggle-labels', true);
    }else{
        toggleLabels(false);
        saveLocal('toggle-labels', false);
    }

});

d3.json("splc_kkk_depth.json", function (error, json) {
    if (error) throw error;

    buildTree(json,2);

    root = json;
    initRoot(root);
    saveLocal("root", root);
    root.nodes = filterNode(root.nodes, 1);
    root.links = filterNode(root.links, 1);
    var current = {nodes: root.nodes, links: root.links};
    saveLocal('current', current);
    updateNodeOptionsArray(current);
    update(current);
});

function Branch(depth, data, children){
    this.depth = depth;
    this.nodes = data.nodes;
    this.links = data.links;
    this.children = children || []
}

function buildTree(data, depth){
    var parentLevel = depth -1;

    if(parentLevel <= 0){
        //root
    }
    var branchdata ,
        branch = [] ,
        lastChild = undefined;

    for(var i = 0; i < depth ; i++){
        branchdata = {};
         branchdata.nodes = data.nodes.filter(function (node) {
            return node.level === i + 1;
        })
         branchdata.links = data.links.filter(function (link) {
            return link.level === i + 1;
        })

        var  branch = new Branch(i+1,branchdata, []);


        if(lastChild)
         lastChild.children = branch;

        if(i < depth -1)
        lastChild = branch;

    }

    //todo - every time children are requested they are found by level then removed from level and saved on the node
    //todo - to find children first check node directly then level
    //todo - display one level at a time plus the focus from the parent level with the other nodes faded and the selected node emphasised

    //todo use flatten method to get all nodes at that level if not at the node and then filter
    //todo - if chikdren received directly from node no need to filter !!!
    //todo - eveytime the children are received savelocal gets called to save existing data.
    //todo - network call is made secondary to localstorage.. it gets called but just after with a hash of local storage to test diff

    // data.nodes.sort();
    // data.nodes.forEach(function (node) {
    //     var childLinks = data.links.filter(function (l) {
    //         return l.sourceStr === node.id || l.targetStr === node.id;
    //     })
    //
    //    var children = data.nodes.filter(function (t) {
    //        return childLinks.some(function (a) {
    //            return a.targetStr === t.id;
    //        })
    //    })
    //     node.children = children;
    // });

    return lastChild;
}

function toggleLabels(on) {
    if(!on){
        label.filter(function (l) {
            return l;
        }).style("opacity", 0);
        labelsOn = false;
    }else{
        label.filter(function (l) {
            return l;
        }).style("opacity", 1);
        labelsOn = true;
    }
}

function toggleLinks(on) {
    if(!on){
        link.filter(function (l) {
            return l;
        }).style("opacity", 0);
        linksOn = false;
    }else{
        link.filter(function (l) {
            return l;
        }).style("opacity", 1);
        linksOn = true;
    }
}

function filterNode(nodes, level) {
    return nodes.filter(function (n) {
        return n.level === level;
    });
}

function filterLink(links, level) {
    return links.filter(function (n) {
        return n.level === level;
    });
}


function initRoot(r) {
    r.nodes.forEach(function (item, index) {
        item.collapsed = true;
    });
    r.links.forEach(function (item, index) {
        item.collapsed = true;
    });
}

function filterJsonByLevel(data) {

    data.nodes = data.nodes.filter(function (n) {
        if (!nodefunc)
            return data.nodes;

        return nodefunc(data);
    });

    data.links = data.links.filter(function (l) {
        if (!linkfunc)
            return data.links;

        return linkfunc(data);
    });

    return data;
}

function sortRootByLevel(data, rootLevel) {
    var levelOnes = Enumerable.From(data.nodes)
            .Where(function (x) {
                return x.level === 1
            })
            // })
            // .OrderBy(function (x) {
            //     return x.user.screen_name
            // })
            .Select(function (x) {
                return x
            })
            .ToArray(),

        levelTwoData = Enumerable.From(data.nodes)
            .Where(function (x) {
                return x.level === 2
            })
            // })
            // .OrderBy(function (x) {
            //     return x.user.screen_name
            // })
            .Select(function (x) {
                return x
            })
            .ToArray(),

        levelOneLinks = Enumerable.From(data.links)
            .Where(function (x) {
                return x.level === 1
            })
            // })
            // .OrderBy(function (x) {
            //     return x.user.screen_name
            // })
            .Select(function (x) {
                return x
            })
            .ToArray();

    levelTwoLinks = Enumerable.From(data.links)
        .Where(function (x) {
            return x.level === 2
        })
        // })
        // .OrderBy(function (x) {
        //     return x.user.screen_name
        // })
        .Select(function (x) {
            return x
        })
        .ToArray();

    for (var r = 0; r < levelOnes.length; r++) {
        var currentLevelOne = levelOnes[r];

        if (currentLevelOne.id === "58102d5b-91ca-4038-e053-32041e0a5e4f") {
            console.log("should have some children....")
        }
        var level2Associates = getChildren(levelTwoData, levelTwoLinks, currentLevelOne.id);

        if (level2Associates.length > 0) {
            if (!currentLevelOne.childen)
                currentLevelOne.children = [];
            currentLevelOne.children.push(level2Associates);
        }
    }

    // for(var r= 0; r < levelOnes.length; r ++){
    //     var current =  levelOnes[r];
    //     current.children = [];
    //    for(var s = 0; s < levelTwoLinks.length; s++){
    //        var currentLink =  levelTwoLinks[s];
    //        var levelTwoAssociates = getChildren(levelTwos, currentLink);
    //        for(var l =0; l < levelTwoAssociates.length; l++){
    //            currAssociate = levelTwoAssociates[l];
    //            if(currAssociate.id === current.id){
    //                current.children.push(currAssociate)
    //            }
    //        }
    //    }
    // }
    saveLocal("struct", parsed);
    return parsed;
}

function getChildren(levelTwoData, levelTwoLinks, id) {
    var children = [];
    levelTwoLinks = Enumerable.From(levelTwoLinks)
        .Where(function (x) {
            return x.sourceStr === id || x.targetStr === id;
        })
        // })
        // .OrderBy(function (x) {
        //     return x.user.screen_name
        // })
        .Select(function (x) {
            return x
        })
        .ToArray();

    for (var y = 0; y < levelTwoData.length; y++) {
        for (var l = 0; l < levelTwoLinks.length; l++) {
            if (levelTwoLinks[l].sourceStr === levelTwoData[y].id
                ||
                levelTwoLinks[l].targetStr === levelTwoData[y].id) {
                children.push(levelTwoData[y]);
            }
        }
    }
    return children;
}

function showInfoPopup(d) {
    popupInfoDiv.transition()
        .duration(200)
        .attr("class", "info")
        .style("opacity", 1);
    popupInfoDiv.html("[level " + d.level + "] " + d.name)
        .style("left", d.x + "px")
        .style("top", d.y + "px");
}

function hideInfoPopup(when, delayTime) {
    popupInfoDiv.transition()
        .duration(when)
        .delay(delayTime)
        .style("opacity", 0);
}

function update(data) {
    var nodes = data.nodes;
    var l = data.links;//d3.layout.tree().links(nodes); //root.children[0].links;

    var edges = [];
    nodes.forEach(function (n) {
        n.collapsed = false;
    });
    l.forEach(function (e) {
        var sourceNode = nodes.filter(function (n) {
                return n.id === e.sourceStr;
            })[0],
            targetNode = nodes.filter(function (n) {
                return n.id === e.targetStr;
            })[0];

        edges.push({
            collapsed: false,
            source: sourceNode,
            target: targetNode,
            value: e.value,
            level: e.level,
            id: e.id,
            name: e.name
        });
    });

    force.nodes(nodes)
        .links(edges)
        .linkDistance(getLinkDistanceByLevel)
        .start();

    //Update the links…
    link = link.data(edges);

    // Exit any old links.
    link.exit().remove();

    // Enter any new links.
    link.enter().insert("line", ".nodes")
        .attr("class", "links")
        .attr("x1", function (d) {
            return d.source.x;
        })
        .attr("y1", function (d) {
            return d.source.y;
        })
        .attr("x2", function (d) {
            return d.target.x;
        })
        .attr("y2", function (d) {
            return d.target.y;
        })
        .style("stroke", getLinkColor)
        .style("marker-end", "url(#resolved)")
        .attr("stroke-width", getStrokeWidthByLinkType);

    // Update the nodes…
    node = node.data(nodes, function (d) {
        return d.id;
    }).attr("fill", getFillColorForNode);

    // Exit any old nodes.
    node.exit().remove();

    // Enter any new nodes.
    node.enter().append("circle")
        .attr("class", "nodes")
        .attr("cx", function (d) {
            return d.x;
        })
        .attr("cy", function (d) {
            return d.y;
        })
        .attr("r", getNodeRadiusByNodeType)
        .style('stroke', getColorForNode)
        .attr('stroke-width', getStrokeWidthByNodeGroup)
        .attr("fill", getFillColorForNode)
        .on("click", nodeClick)
        .call(force.drag)
        .on("mouseover", function (d) {

            this.setAttribute("style", "stroke: " + linkColor + ";");

            link.filter(function (l) {
                return l.source.id === d.id || l.target.id === d.id;
            }).style("stroke", linkColor);

            label.filter(function (l) {
                return l.id === d.id;
            }).style("fill", linkColor);

            showInfoPopup(d);
        })
        .on("mouseout", function (d) {
            this.setAttribute("style", "stroke:" + getColorForNode(d) + ";");

           hideInfoPopup(500, 0);
            link.filter(function (l) {
                return l.source.id === d.id || l.target.id === d.id;
            }).style("stroke", colors[0]);

            label.filter(function (l) {
                return l.id === d.id;
            }).style("fill", "#666666");

            d3.select(this).select('text.info').remove();
        })
        .on("contextmenu", function (data, index) {
            setSelectedNode(data);
            d3.select('#context-menu').style('display', 'block');
            contextMenu(this, 'rect');
            d3.event.preventDefault();
        });

    node.each(function(d,i){
            if(!d.url){
                return;
            }
            // append image pattern for each node
            pattern_def.append("pattern")
                .attr("id", "node-img")
                .attr("patternUnits", "objectBoundingBox")
                .attr({
                    "width": "100%",
                    "height": "100%"
                })
                .attr({
                    "viewBox": "0 0 1 1"
                })
                .append("image")
                .attr("xlink:href", d.url) //use xlink:href with image url
                .attr({
                    "x":0,
                    "y":0,
                    "width": "1",
                    "height": "1",
                    "preserveAspectRatio": "none"
                })

            d3.select(this).attr("fill", "url(#node-img)")
            // fill node with the image pattern
            // if the image is fixed for every node, you can add the fill attribute in node settings
        });

    label = svg.selectAll("nodes")
        .data(nodes)
        .enter()
        .append("text")
        .text(function (d) {
            return "[" + d.level + "] " + d.name;
        })
        .attr("class", "tip")
        .style("fill", "#666666")
        .style("font-family", "raleway sans-serif")
        .style("font-size", 12);

}

$(document).ready(function(e){
    $('.search-panel .dropdown-menu').find('a').click(function(e) {
        e.preventDefault();
        var param = $(this).attr("href").replace("#","");
        var concept = $(this).text();
        $('.search-panel span#search_concept').text(concept);
        $('.input-group #search_param').val(param);
        searchBy = param;

        $('#search-btn').on('click', function () {
            var searchInput = $('#search-input'),
                searchTerm = searchInput.val();

            if(searchTerm && searchTerm !== "")
            runSearch(searchBy, searchTerm);
        })
    });

    $("#search-input").autocomplete({
        source: optArray,
        minLength: 2,
        position : {
            offset: '25 4' }
    });
});

function updateNodeOptionsArray(graph) {
    optArray = [];
    for (var i = 0; i < graph.nodes.length - 1; i++) {
        var entry = graph.nodes[i].name;
        if(optArray.indexOf(entry) === -1)
            optArray.push(entry);
    }
 //   optArray = optArray.sort();
}

function runSearch(searchBy, searchTerm) {
    var otherNodes = node.filter(function (d, i) {
        return !d.name.toLowerCase().includes(searchTerm.toLowerCase());
    }),
        x =0,
        y=0,
        lbl = "",
        lvl = "",
    foundNode = node.filter(function (d, i) {
        if(d.name.toLowerCase().includes(searchTerm.toLowerCase())){
            x = d.x;
            y = d.y;
            lvl = d.level;
            lbl = d.name;
            return true ;
        }
        return false;
    }).style("stroke", linkColor)
        .attr("r", expandNodeRadius);

    foundNode.x = x;
    foundNode.y = y;
    foundNode.name = lbl;
    foundNode.level = lvl;
    showInfoPopup(foundNode);
    hideInfoPopup(500, 1000);

    otherNodes.style("opacity", "0");
    link.style("opacity", "0");

    foundNode.transition()
        .duration(2000)
        .attr("r", getNodeRadiusByNodeType);

    node.transition()
        .duration(2500)
        .style("opacity", 1)
        .style("stroke", "#ffffff");

    if(linksOn)
    link.transition()
        .duration(3000)
        .style("opacity", 1);

    if(labelsOn)
    label.transition()
        .duration(3000)
        .style("opacity", 1);
}

function setLaunchPoint(context) {
    var position = d3.mouse(context);
    if (!position) {
        position[0] = width / 2;
        position[1] = height / 2;
    }
    expandLaunchPosition = position;
}

function setSelectedNode(node) {
    selectedNode = node;
}

function getStrokeWidthByNodeGroup(d) {
    // if(!d){
    //     return false;
    // }
    // var group = d.group;
    // switch (group){
    //     case 0: {
    //        return 10;
    //     }
    //     case 4:{
    //         return 15;
    //     }
    //     case 3:{
    //         return 20;
    //     }
    //     default:{
    return 1;
    //    }
    //}
}

function getStrokeWidthByLinkType(d) {
    if (!d) {
        return false;
    }
    return 1;
    // var type = d.type;
    // switch (type){
    //     case 'third': {
    //         return 1.20;
    //     }
    //     case 'connection':{
    //         return 1.20;
    //     }
    //     case 'bad':{
    //         return 1.20;
    //     }
    //     default:{
    //         return 1.20;
    //     }
    // }
}

function getNodeRadiusByNodeType(d) {
    if (!d) {
        return false;
    }
    if (d.typeId === "540E0C56DD6E3DEAE0532A041E0ADCFC") {
        return 12;
    }
    else if (d.typeId === "540E0C56DD6B3DEAE0532A041E0ADCFC") {
        return 18;
    }
    return 10; //self
}

function expandNodeRadius(d) {
    if (!d) {
        return false;
    }
    return getNodeRadiusByNodeType(d) * 1.2;
}

function getFillColorForNode(d) {
    if (!d) {
        return false;
    }
    if(selectedNode.id === d.id)
        return selectedNodeColor;

    return colorMapping[d.level];
}

function getColorForNode(d) {
    return '#9f9f9f'; //colors[d.group];
}

function getLinkDistanceByLevel(item) {
    if (!item) {
        return false;
    }
    var lvl = item.level;

    if (lvl === 1) {
        return 75;
    }
    else if (lvl === 2) {
        return 175;
    }
}

function getLinkColor(l) {
    if (!l) {
        return false;
    }

    return colors[0];

    // type = l.type;
    // switch (type){
    //     case 'bad' :{
    //        return colors[3];
    //     }
    //     case 'connection':{
    //        return colors[0];
    //     }
    //     case 'third' : {
    //        return colors[8];
    //     }
    //     default:{
    //         return colors[7];
    //     }
    // }
}

function contextMenu(that, newContext) {
    d3.event.preventDefault();

    var position = d3.mouse(that);
    d3.select('#context-menu')
        .style('position', 'absolute')
        .style('left', (position[0] + 10) + "px")
        .style('top', (position[1] + 60) + "px")
        .style('display', 'inline-block')
        .on('mouseleave', function () {
            d3.select('#context-menu').style('display', 'none');
            context = null;
        });

    setLaunchPoint(that);

    d3.select('#ctext-edit').on('click', function (n) {
        console.log('edit clicked..');
        console.log(selectedNode);

    });
    d3.select("#ctext-exp").on('click', function (n) {
        console.log('expanding ' + selectedNode);
        handleExpand(selectedNode);
    })
    d3.select("#ctext-coll").on('click', function (n) {
        console.log('collapsing ' + selectedNode);
        handleCollapse(selectedNode);
    })
}

function getLocal(key) {
    if (localStorage) {
        var unparsed = localStorage.getItem(key);
        if (unparsed) {
            return JSON.parse(unparsed) || null;
        }
    }
    return null;
}

function saveLocal(key, item) {
    if (localStorage) {
        var stringified = JSON.stringify(item);
            localStorage.setItem(key, stringified);
            return true;
    }
    return false;
}

function handleCollapse(n) {
    var local = getLocal('current'),
        currentNodes = local.nodes,
        currentLinks = local.links;

    currentLinks = currentLinks.filter(function (cn) {
        return cn.sourceStr !== n.id || cn.targetStr !== n.id; // && cn.level < n.level;
    });

    var nodesClone = jQuery.extend(true, {}, currentNodes);
    currentLinks.forEach(function (l) {
        for (var i = 0; i < nodesClone.length; i++) {
            var currentNode = currentNodes[i];
            if (currentNode.id === l.sourceStr || currentNode.id === l.targetStr) {
                currentNodes.splice(currentNodes.indexOf(currentNode), 1);
            }
        }
    });
    var newLocal = {
        links: currentLinks,
        nodes: currentNodes
    };

    updateNodeOptionsArray(newLocal);
    update(newLocal);
}

function handleExpand(n) {
    var sourceId = n.id,
        level = n.level + 1;
    var local = getLocal('root'),
        current = getLocal('current'),
        newLinks = filterLink(local.links, level),
        newNodes = filterNode(local.nodes, level);

    newLinks = newLinks.filter(function (l) {
        return l.sourceStr === sourceId || l.targetStr === sourceId;
    });

    var extraNodes = [];
    newLinks.forEach(function (l) {
        for (var i = 0; i < newNodes.length; i++) {
            var currentNode = newNodes[i];
            if (currentNode.id === l.sourceStr || currentNode.id === l.targetStr) {
                extraNodes.push(currentNode);
            }
        }
    });

    newLinks.forEach(function (l) {
        current.links.push(l);
    });
    extraNodes.forEach(function (n) {
        current.nodes.push(n);
    });

    saveLocal('current', current);
    updateNodeOptionsArray(current);
    update(current);
}

function tick(e) {
    if(linksOn)
    link.attr("x1", function (d) {
        return d.source.x;
    })
        .attr("y1", function (d) {
            return d.source.y;
        })
        .attr("x2", function (d) {
            return d.target.x;
        })
        .attr("y2", function (d) {
            return d.target.y;
        });

    node.attr("cx", function (d) {
        return d.x;
    })
        .attr("cy", function (d) {
            return d.y;
        });

    if(labelsOn)
    label.attr("x", function(d){
        return d.x;
    }).attr("y", function (d) {
            return d.y - 10;
    });
}

//Toggle children on click.
function nodeClick(d) {
    if (!d3.event.defaultPrevented) {

    }
}

// Returns a list of all nodes under the root.
function flatten(root) {
    var nodes = [], i = 0;

    function recurse(node) {
        if (node.children) {
            node.children.forEach(recurse);
        }
        if (!node.id) {
            node.id = ++i;
        }
        nodes.push(node);
    }

    recurse(root);
    return nodes;
}
