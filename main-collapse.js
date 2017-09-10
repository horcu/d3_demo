var width = 1360,
    height = 700,
    root,
    linkColor = '#444444',
    rootBranches = [],
    selectedNode = {},
    optArray = [],
    searchBy = "name",
    clusterOn = false,
    searchBox = $("#search-input"),
    labelsOn,
    linksOn,
    linksCheckbox = $('#show-link-cb'),

    labelsCheckbox = $('#show-label-cb'),
    randomColors = d3.scale.category20(),
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
labelsOn = getLocal('labelsOn')|| true;
linksOn = getLocal('linksOn') || true;
linksCheckbox.attr('checked', linksOn);
labelsCheckbox.attr('checked', labelsOn);

var force = d3.layout.force()
        .gravity(.15)
        //.friction(.9)
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
    allLinks =[],
    allNodes =[],

    link = svg.selectAll(".links"),
    node = svg.selectAll(".nodes"),
    label = svg.selectAll(".labels");


linksCheckbox.on('click', function () {
    if ($(this).is(':checked')) {
        toggleLinks(true);
        saveLocal('linksOn', true);
    } else {
        toggleLinks(false);
        saveLocal('linksOn', false);
    }
});

labelsCheckbox.on('click', function () {
    if ($(this).is(':checked')) {
        toggleLabels(true);
        saveLocal('labelsOn', true);
    } else {
        toggleLabels(false);
        saveLocal('labelsOn', false);
    }

});

d3.json("bad.json", function (error, json) { //splc_kkk_depth.json
    if (error) throw error;

    var groupedLinks = groupByLinks(json.results[0]);

    var mappedGroups = mapGroups(groupedLinks);
    saveParentChildrenAssociations(mappedGroups);
    allLinks = json.results[0].links;
    allNodes = json.results[0].nodes;


    var filtered = getParentLinksAndNodes(mappedGroups, json.results[0].nodes);
    saveLocal('parent-links', filtered.parentLinks);
    saveLocal('parent-nodes', filtered.parentNodes);


    // var tree = buildTree(json.results[0], 1);
    // var filteredNodes = filterNodes(tree, 1);
    //root = json;
    //initRoot(root);
    //saveLocal("root", filteredNodes);
   // root.nodes = filterNodes(root.nodes, 1);
   // root.links = filterLinks(root.links, 1);
    //var current = {nodes: tree, links: root.links};
    //saveLocal('current', current);
    //updateNodeOptionsArray(filteredNodes);

    update(filtered);
});

function saveParentChildrenAssociations (groups) {
    var results = {};
    //localStorage.clear();

    for(var i=0; i < groups.length; i++){
        var current = groups[i],
            key = current[0].source,
        associates = [];
        for(var x=0; x < current.length; x++){
           var target = current[x].target,
                edgeId = current[x].edgeID;
            associates.push({edgeId : edgeId, target: target});
        }
        saveLocal(key, associates);
    }
    // for(key in groups){
    //     if(!results[key]){
    //         results[key] = [];
    //     }
    //     results[key].push(groups[key]);
    // }

}

function mapGroups (groups) {
    return _.map(groups)
}

function Node (id, name, level, links, children) { // a branch node is a node at a particular level
    this.links = links;
    this.level = level;
    this.id = id;
    this.name = name;
    this.children = children || [];
    this._children = [];
    this.collapse = function collapse () {
        this._children = this.children;
        this.children = [];
    };
    this.expand = function expand() {
        this.children = this._children;
        this._children = [];
    }
}

function groupByLinks(data){

    var links = data.links;
    var groups = _.groupBy(links, "source");
    return groups;
}

function getParentLinksAndNodes (links, nodes) {

    var parentLinks = [],
        parentNodes = [];

    links.forEach(function (l) {
        if(l.length > 1){
            parentLinks.push(l);
            var node = nodes.filter(function (n) {
               return n.id === l[0].source;
            })
            parentNodes.push(node);
        }
    })
    return {
    links: parentLinks,
    nodes: parentNodes
    }
}

function buildTree(data, depth){
    var branches = {};

    for(var i = 0; i < depth ; i++){
        var level = i+1;
        var branchNodes = [];

        var currentLevelNodes = data.nodes.filter(function (t) {
            return t.level === level;
        })
        var currentLevelLinks = data.links.filter(function (l) {
            return l.level === level;
        })
        currentLevelNodes.forEach(function (n) {
           var links = getLinksForNode(n,level, currentLevelLinks),
           children = getChildren(n,links, currentLevelNodes);
           branchNode = new Node(n.id, n.name, level, links, children);
           branchNodes.push(branchNode);
       })
        branches[i] = branchNodes;
    }

    return branches;
}

function getLinksForNode (node, level, allLinks) {
    var results = [];
    allLinks.forEach(function (l) {
        if(l.level === level && (l.source === node.id || l.target === node.id)){
            results.push(l);
        }
    })
    return results;
}

function toggleLabels(on) {
    if (!on) {
        label.filter(function (l) {
            return l;
        }).style("opacity", 0);
        labelsOn = false;
        //force.restart();
    } else {
        label.filter(function (l) {
            return l;
        }).style("opacity", 1);
        labelsOn = true;
        //force.restart();
    }
}

function toggleLinks(on) {
    if (!on) {
        link.filter(function (l) {
            return l;
        }).style("opacity", 0);
        linksOn = false;
        //force.restart();
    } else {
        link.filter(function (l) {
            return l;
        }).style("opacity", 1);
        linksOn = true;
        //force.restart();
    }
}

function filterNodes(nodes, level) {
    var key = level -1 >= 0 ? level -1 : 1;
    return nodes[key];
}

function filterLinks(links, level) {
    var bad = [];
    return links.filter(function (n) {
        if(!n.level)
            bad.push(n);
        return  n.level === level;
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

function getChildren(node, links, nodes) {
    var childNodes = [];

    links.forEach(function (link) {
        for (var i = 0; i < nodes.length; i++) {
            var currentNode = nodes[i];
            if (currentNode.id === link.source && link.target === node.id) {
                childNodes.push(currentNode);
            }
        }
    });
    return childNodes;
}

function showInfoPopup(d) {
    popupInfoDiv.transition()
        .duration(200)
        .attr("class", "info")
        .style("opacity", 1);
    popupInfoDiv.html("[" + d.id + "] " + d.name )
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
    var nodes = data.nodes; // data.nodes;
    var links = data.links;//d3.layout.tree().links(nodes); //root.children[0].links;

    var edges = [];
    nodes.forEach(function (n) {
        n.collapsed = false;
       // links.push(n.links);
    });

    nodes = $.map(nodes, function (node) {
        return node;
    })

     links = $.map(links, function(link){
        if(link !== null || link !== undefined || typeof(link) !== "undefined")
        return link;
    });

    links.forEach(function (e) {
        var sourceNode = nodes.filter(function (n) {
                return n.id === e.source;
            })[0],
            targetNode = nodes.filter(function (n) {
                return n.id === e.target;
            })[0];

            if(sourceNode && targetNode)
        edges.push({
            collapsed: false,
            source: sourceNode,
            target: targetNode,
            value: e.value,
            level: e.level,
            id: e.edgeID,
            name: e.name,
            weight: 1
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
        //.on("click", nodeClick)
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

    node.each(function (d, i) {
        if (!d.url) {
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
                "x": 0,
                "y": 0,
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


$('.search-panel .dropdown-menu').find('a').click(function (e) {
    e.preventDefault();
    var param = $(this).attr("href").replace("#", "");
    var concept = $(this).text();
    $('.search-panel span#search_concept').text(concept);
    $('.input-group #search_param').val(param);
    searchBy = param;

    $('#search-btn').on('click', function () {
        var searchInput = $('#search-input'),
            searchTerm = searchInput.val();

        if (searchTerm && searchTerm !== "")
            runSearch(searchBy, searchTerm);
    })
});

$(document).ready(function (e) {
    $(searchBox).autocomplete({
        source: optArray,
        minLength: 3,
        position: {
            offset: '25 4'
        },
        _renderItem: function (ul, item) {
            return $("<li>")
                .attr("data-value", item.value)
                .append(item.label)
                .appendTo(ul);
        },
        _renderMenu: function (ul, items) {
            var that = this;
            $.each(items, function (index, item) {
                that._renderItemData(ul, item);
            });
            $(ul).find("li:odd").addClass("odd");
        },
        create: function (event, ui) {
            var test = ui;
        },
        open: function (event, ui) {
            var test2 = ui;
        },
        response: function (event, ui) {
            var test3 = ui;
        },
        search: function (event, ui) {
            var test4 = ui;
        }
    });

    searchBox.attr('autocomplete', 'on');

    function drag_start(event) {
        var style = window.getComputedStyle(event.target, null);
        event.dataTransfer.setData("text/plain",
            (parseInt(style.getPropertyValue("left"),10) - event.clientX) + ',' + (parseInt(style.getPropertyValue("top"),10) - event.clientY));
    }
    function drag_over(event) {
        event.preventDefault();
        return false;
    }
    function drop(event) {
        var offset = event.dataTransfer.getData("text/plain").split(',');
        var dm = document.getElementById('settings-panel');
        dm.style.left = (event.clientX + parseInt(offset[0],10)) + 'px';
        dm.style.top = (event.clientY + parseInt(offset[1],10)) + 'px';
        event.preventDefault();
        return false;
    }

    var dm = document.getElementById('settings-panel');
    dm.addEventListener('dragstart',drag_start,false);
    document.body.addEventListener('dragover',drag_over,false);
    document.body.addEventListener('drop',drop,false);
});

function updateNodeOptionsArray(graph) {
    optArray = [];
    for (var i = 0; i < graph.length - 1; i++) {
        var entry = graph[i].name;
        //if(optArray.indexOf(entry) === -1)
        optArray.push(entry.toLowerCase());
    }
    //   optArray = optArray.sort();
}

function runSearch(searchBy, searchTerm) {
    var otherNodes = node.filter(function (d, i) {
            return !d.name.toLowerCase().includes(searchTerm.toLowerCase());
        }),
        x = 0,
        y = 0,
        lbl = "",
        lvl = "",
        foundNode = node.filter(function (d, i) {
            if (d.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                x = d.x;
                y = d.y;
                lvl = d.level;
                lbl = d.name;
                return true;
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

    if (linksOn)
        link.transition()
            .duration(3000)
            .style("opacity", 1);

    if (labelsOn)
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

function getFillColorForNode(d, i) {
    if (!d) {
        return false;
    }
    if (selectedNode.id === d.id)
        return selectedNodeColor;

    if(d.level)
    return colorMapping[d.level];

    return randomColors(i);
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
        return cn.source !== n.id || cn.target !== n.id;
    });

    //get the child nodes for the selected node
    var children = getChildren(n, currentLinks, currentNodes);

    //filter out the child nodes
    for (var i = 0; i < children.nodes.length; i++) {
        currentNodes = currentNodes.filter(function (nd) {
            return nd.id !== children.nodes[i].id;
        });
    }
    //filter out the child links
    for (var i = 0; i < children.links.length; i++) {
        currentLinks = currentLinks.filter(function (nd) {
            return nd.id !== children.links[i].id;
        });
    }

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
    var current = getLocal(sourceId),
    links =[],
    nodes =[];

    current.forEach(function (c) {
        for(var i=0; i < allLinks.length; i ++){
            if(allLinks[i].edgeID === c.edgeId){
                links.push(allLinks[i]);
            }
        }

        for(var x=0; x < allNodes.length; x ++){
         if(allNodes[x].id === c.target){
             nodes.push(allNodes[x]);
           }
        }
    });

    var results = {
        links : links,
        nodes: nodes
    }
    update(results);
}

function objectsAreTheSame(obj1, obj2) {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
}

function tick(e) {
         var maxAlpha = node[0].length > 2000 && link[0].length > 2000 ? 0.1 : 0.05;
    if (linksOn){
        if (e.alpha > maxAlpha ) {
            link.attr("x1", function (d) {
                return  d.source.x;
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
        }
    }

    if (e.alpha > maxAlpha ) {
        node.attr("cx", function (d) {
            return d.x;
        })
            .attr("cy", function (d) {
                return d.y;
            });
    }

    if (labelsOn){
        if (e.alpha > maxAlpha ) {
            label.attr("x", function (d) {
                return d.x;
            }).attr("y", function (d) {
                return d.y - 10;
            });
        }
    }
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


