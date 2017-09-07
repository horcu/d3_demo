$(function () {
    var fbase = new Firebase('https://d3-testbed.firebaseio.com'),
        svg = d3.select("svg"),
        linksPath = "/links",
        nodesPath = "/nodes",
        faded = false,
        width = +svg.attr("width"),
        height = +svg.attr("height"),
        link = null,
        node = null,
        label = null,
        existingBtnIds = [],
        expandLaunchPosition = [],
        mainItemId = ['001'],
        itemSet = {},
        clusterOn = false,
        labelsOn = true,
        linkedByIndex = {},
        clusters = new Array(9);
        form = d3.select("#btn-container")
        .append("form"),
        selectedNode = {},
        itemKey = 'link-nodes-json',
        ttDiv = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0),
        optArray = [],
        linkColor = '#444444',
        maxRadius = 300,
        minimumAge  = 5;
        searchBtn = $('#search-btn'),
        clusterBtn = $('#cluster-btn'),
        labelsBtn = $('#labels-btn'),
        flushBtn = $('#flush-btn'),
        savedItems = localStorage.getItem(itemKey),
        selectedLabelIndex = null,
        colors = ["#dbdbdb","#4d6cbd", "#b141bd", "#bd7338", "#28bd5c", "#bbbd0a", "#8c564b", "#3c10bd", "#bd0f34", "#5B6CBD", "#17becf"],
            colorMapping = {
                "brother" : "#bcbd22",
                "sister": "#bcbd22",
                "father" : "#4d6cbd",
                "mother" : "#4d6cbd",
                "daughter":"#28bd5c",
                "son": "#28bd5c",
                "stepson": "#1b17bd",
                "stepdaughter": "#1b17bd",
                "friend": "#3c10bd",
                "boyfriend": "#b141bd",
                "girlfriend": "#b141bd",
                "nephew": "#bd0f34",
                "neice": "#bd0f34",
                "cousin": "#bd7338",
                "self": "#64686f"
            },
        simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(function(d) {
            return d.id;
        }).distance(getLinkDistanceByConnectionType).strength(.75))
        .force("charge", d3.forceManyBody())
        //.force("gravity", .4)
        .force("center", d3.forceCenter(width / 2, height / 2));

    svg.append("defs").selectAll("marker")
        .data(["suit", "licensing", "resolved"])
        .enter().append("marker")
        .attr("id", function(d) {
            return d;
        })
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 25)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .style("stroke", "#4679BD")
        .style("opacity", "0.6");

    //TODO - REMOVE

    var initUrl = "https://d3-testbed.firebaseio.com/associations/1/Jessica.json";

    //TODO END REMOVE

    d3.json(initUrl, function(error, graph) { //"splc_kkk_depth.json", function(error,graph){
        if (error) throw error;

        var bucket = getLocal(itemKey);
        if(!bucket || !Object.keys(bucket).length === 0 && bucket.constructor === Object){
            initializeLocalStorage(graph);
        }

        setSelectedNode(graph);
        sanitize(graph);

        var local = getLocal(itemKey);
        local[selectedNode.id] = graph;
        saveLocal(itemKey, local);

        init(graph, false);
    });

    flushBtn.on('click', function () {
        flushLocal();
        alert('local storag cleared');
    });
    $('#min-age').on('change', function (r) {
       setMinimumAge(r.target.value);
    });
    searchBtn.on('click', function () {
        searchNode(node, link, label);
    });
    clusterBtn.on('click', function () {
        if(clusterOn){
            simulation.force("cluster", null);
            clusterOn = false;
        }else{
            simulation.force("cluster", forceCluster);
            clusterOn = true;
        }
        simulation.alpha(1).start();
    });
    labelsBtn.on('click', function () {
        toggleLabel();
    });



    function branchOff(root) {
        var
        levels = {};

        nodes.forEach(function (t) {
            if(levels[t.level] === null){
                levels[levels.length] = t.level;
            }
        });

        var branches = [];

        levels.forEach(function (t, i) {
             var branch = {
                 name : selectedNode.id
             };
             branch.children = [];
             branches.push(branch);
        });


        var nodes = flatten(root),
            links = d3.layout.tree().links(nodes);

        // Restart the force layout.
        simulation
            .nodes(nodes)
            .links(links)
            .start();

        // Update links.
        link = link.data(links, function(d) {
            return d.target.id; });

        link.exit().remove();

        link.enter().insert("line", ".node")
            .attr("class", "link");

        // Update nodes.
        node = node.data(nodes, function(d) {
            return d.id;
        });

        node.exit().remove();

        var nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .on("click", click)
            .call(force.drag);

        nodeEnter.append("circle")
            .attr("r", function(d) { return Math.sqrt(d.size) / 10 || 4.5; });

        nodeEnter.append("text")
            .attr("dy", ".35em")
            .text(function(d) { return d.name; });

        node.select("circle")
            .style("fill", color);
    }

    function setMinimumAge(v) {
       minimumAge = v;
       var parsedMinAge = parseInt(minimumAge, 10);
        var nodes = node.filter(function (l) {
            return l.age <= parsedMinAge;
        }).style("fill", "#ffffff")
            .style("opacity", 0.1);

        var okNodes  = node.filter(function (l) {
            return l.age >= parsedMinAge;
        });

        nodes.transition()
            .duration(500)
            .style("fill", '#ffffff');

        okNodes.transition()
            .duration(500)
            .style("fill", getFillColorForNode)
            .style("opacity", 1);
    }
    function setSelectedNode(node) {
        selectedNode = node;
    }
    function initializeLocalStorage(graph) {
        itemSet[mainItemId[0]] = graph;
        saveLocal(itemKey, itemSet);
    }
    function handleExpand(){
        if(linkMap[selectedNode.id] === undefined){
            alert("nothing found for that person");
            return false;
        }
        path = '/associations/' + linkMap[selectedNode.id].url;
        getLinkedData(path);
    }
    function handleCollapse(){
        path = '/' + selectedNode.name + '/';
        //removeChildById(selectedNode)
        collapseChildren();
    }
    function getLinkedData(path) {
        var firebaseRef = fbase.child(path).ref();
        firebaseRef.once('value', function(snapshot) {
            var data = snapshot.val();
            if(data === null)
                return false;

            var history = getLocal("nav_history");
            if(history !== null){
                var oldId = history.pop();
                collapseChildren(oldId);
            }

            var newData = addNodes(data);
            sanitize(data);
            var local = getLocal(itemKey);
            local[selectedNode.id] = data;
            saveLocal(itemKey,local);
            restartForce(newData);
        });
    }
    function saveLocal(key, item) {
        if(localStorage){
            var stringified = JSON.stringify(item);

            if(!localStorage.getItem(key)){
                localStorage.setItem(key, stringified);
                return true;
            }
        }
        return false;
    }
    function flushLocal() {
        localStorage.setItem(itemKey, []);
    }
    function getLocal(key) {
        if(localStorage){
            var unparsed = localStorage.getItem(key);
            if(unparsed){
                return JSON.parse(unparsed) || null ;
            }
        }
        return null;
    }
    function init(graph) {
        updateNodeOptionsArray(graph);
        optArray = optArray.sort();

        $(function () {
            $("#search").autocomplete({
                source: optArray,
                minLength: 2,
                position : {
                    offset: '25 4' }
            });
        });

        var forceCollide = addForceCollision();

         enterLinks(graph.links);
         enterNodes(graph.nodes);
         addLabels(graph.nodes);

        simulation.force("collide", forceCollide);
        simulation.nodes(graph.nodes).on("tick", function () {

                    link
                        .attr("x1", function(d) {
                            return d.source.x; })
                        .attr("y1", function(d) {
                            return d.source.y; })
                        .attr("x2", function(d) {
                            return d.target.x; })
                        .attr("y2", function(d) {
                            return d.target.y; });

                    node
                        .attr("cx", function(d) {
                            var radius = getNodeRadiusByNodeType(d);
                            return d.x = Math.max(radius, Math.min(width - radius, d.x));
                        })
                        .attr("cy", function(d) {
                            var radius = getNodeRadiusByNodeType(d);
                            return d.y = Math.max(radius, Math.min(height - radius, d.y));
                        });

                    label.attr("x", function(d){
                        return d.x; })
                        .attr("y", function (d) {
                            return d.y - 10; });

            });
        simulation.force("link").links(graph.links);
        //simulation.velocityDecay(0.2);

        addClusterDataToNodes(node);
        addZoom();


        node.append("text")
            .attr("dx", 12)
            .attr("dy", ".35em")
            .text(function(d) {
                return d.name });

        // node.append('image')
        //     .attr('xlink:href',function(d,i){
        //         return d.img;
        //     }) .attr('height',getNodeRadiusByNodeType -2)
        //     .attr('width',getNodeRadiusByNodeType -2)
        //     .attr('x', function (d) {
        //         return d.x;
        //     } )
        //     .attr('y',function (d) {
        //         return d.y;
        //     });

        if (graph.links.length > 0) {
            createIndexedLinks(graph);
        }

        setMinimumAge(5);

        function addForceCollision() {
            var forceCollide = d3.forceCollide()
                .radius(function (d) {
                    return d.radius + 1.5;
                })
                .iterations(1);
            return forceCollide;
        }

        function enterLinks(links) {
            link = svg.append("g")
                .attr("class", 'links')
                .selectAll("line")
                .data(links)
                .enter().append("line")
                .style("stroke", getLinkColor)
                .style("marker-end", "url(#resolved)")
                .attr("stroke-width", getStrokeWidthByLinkType);
        }

        function addLabels(nodes) {
            label = svg.selectAll("nodes")
                .data(nodes)
                .enter()
                .append("text")
                .text(function (d) {
                    return d.name;
                })
                .attr("class", "tip")
                .style("fill", "#666666")
                .style("font-family", "raleway sans-serif")
                .style("font-size", 12);
        }

        function enterNodes(nodes) {
            node = svg.append("g")
                .attr("class", "nodes")
                .selectAll("circle")
                .data(nodes)
                .enter()

                .append("circle")
                .attr("r", getNodeRadiusByNodeType)
                .style('stroke', getColorForNode)
                .attr('stroke-width', getStrokeWidthByNodeGroup)
                .attr("fill", getFillColorForNode)

                .call(d3.drag()
                    .on("start", dragstarted)
                    .on("drag", dragged)
                    .on("end", dragended))
                .on('dblclick', releasenode)
                .on('click', toggleFade(.1))
                .on("mouseover", function (d) {
                    this.setAttribute("style", "stroke: " + linkColor + ";");

                    link.filter(function (l) {
                        return l.source.id === d.id || l.target.id === d.id;
                    }).style("stroke", linkColor);

                    label.filter(function (l) {
                        return l.id === d.id;
                    }).style("fill", linkColor);
                })
                .on("mouseout", function (d) {

                    this.setAttribute("style", "stroke:" + getColorForNode(d) + ";");
                    ttDiv.transition()
                        .duration(500)
                        .style("opacity", 0);

                    link.filter(function (l) {
                        return l.source.id === d.id || l.target.id === d.id;
                    }).style("stroke", colors[0]);

                    label.filter(function (l) {
                        return l.id === d.id;
                    }).style("fill", "#666666");
                })
                .on("contextmenu", function (data, index) {
                    setSelectedNode(data);
                    d3.select('#context-menu').style('display', 'block');
                    contextMenu(this, 'rect');
                    d3.event.preventDefault();
                })
                ;


            // node.append('image')
            //     .attr('href',function(d,i){
            //        return d.img;
            //      }) .attr('height',getNodeRadiusByNodeType)
            //     .attr('width',getNodeRadiusByNodeType)
            //     .attr('x',0)
            //     .attr('y',0);
        }

        function toggleFade(opac) {
            return function (d) {
                if(faded){
                    unfade(d);
                    faded = false;
                }
                else {
                    fade(d, opac);
                    faded = true;
                }
            };
        }

        function fade(d, opacity) {
                var labels = [],
                    selectedLabelData = null;
                node.style("fill-opacity", function(o) {
                    var isNodeConnectedBool = isNodeConnected(d, o);
                    var thisOpacity = isNodeConnectedBool ? 1 : opacity;
                    if (!isNodeConnectedBool) {
                        this.setAttribute('style', "stroke-opacity:"+opacity+";fill-opacity:"+opacity+";");
                    } else {

                        labels.push(o);
                        if (o === d) selectedLabelData = o;
                    }
                    return thisOpacity;
                });

                link.style("stroke-opacity", function(o) {
                    return o.source === d || o.target === d ? 1 : opacity;
                }).style("stroke", function (d) {
                    return d.source === d ? '#545454' : getLinkColor(d);
                });

                labels.sort(function(a, b){return b.value - a.value;});

                selectedLabelIndex = labels.indexOf(selectedLabelData);
        }

        function unfade(d) {
                selectedLabelIndex = null;
                link.style("stroke-opacity", 1);

                node.style("stroke", getColorForNode)
                    .style("stroke-opacity", 1)
                    .style("fill-opacity", 1)
                    .attr("fill",getFillColorForNode);
        }
        // svg.firebase(fbase, {
        //     // How do we identify each data point?
        //     keyFunc : function(dataSnapshot) {
        //         return dataSnapshot.val();
        //     },
        //     // When new data is added to the Firebase
        //     createFunc : function(newData) {
        //         //var newVal = newData.val();
        //
        //         // if(newVal.siteID) { //nodes
        //         //    // updateNodes(node,newVal);
        //         //     console.log('new nodes...');
        //         // } else{ // links
        //         //    // updateLinks(link, newVal);
        //         //     console.log('new links...');
        //         // }
        //     },
        //     // What to do when a data point has changed
        //     updateFunc : function(newData) {
        //         // var newVal = newData.val();
        //         //
        //         // if(newVal.siteID) { //nodes
        //         //    // updateNodes(node,newVal);
        //         //     console.log('new nodes...');
        //         // } else{ // links
        //         //  //   updateLinks(link, newVal);
        //         //     console.log('new links...');
        //         // }
        //     },
        //     // When a data point gets deleted
        //     deleteFunc : function(deletedData) {
        //
        //         // var newVal = deletedData.val();
        //         // if(newVal.siteID) { //nodes
        //         //    // updateNodes(node,newVal);
        //         //     console.log('new nodes...');
        //         // } else{ // links
        //         //   // updateLinks(link, newVal);
        //         //     console.log('new links...');
        //         // }
        //     }
        // });
        function updateHistoryButtons() {
            var local = getLocal(itemKey);
            //existingBtnIds = [];
            if(!local[selectedNode.id]){
                local[selectedNode.id] = selectedNode;
            }
            saveLocal(itemKey, local);

            for (var  key in local) {
                if(key === "undefined")
                    continue;

                var colorKey = local[key].group;
                if(existingBtnIds.includes(key)){
                    continue;
                }

                form.append("input")
                    .attr("type", "button")
                    .attr("class", "history-btn")
                    .style("stroke", colors[colorKey] )
                    .attr("id", key)
                    .attr("value", key)
                    .attr("onclick", function () {
                        //todo look up the item in local storage
                    });
                    existingBtnIds.push(key);
            }
        }
    }
    function searchNode(node, link, label) {
        //find the node
        var selectedVal = document.getElementById('search').value;
        // var node = svg.selectAll(".nodes");
        if (selectedVal === "none") {
            node.style("stroke", "white").style("stroke-width", "1");
        } else {
            var selected = node.filter(function (d, i) {
                return d.name !== selectedVal;
            });

            foundNode = node.filter(function (d, i) {
                return d.name === selectedVal;
            }).style("stroke", linkColor)
                .attr("r", expandNodeRadius);

            selected.style("opacity", "0");
            link.style("opacity", "0");

            foundNode.transition()
                .duration(2000)
                .attr("r", getNodeRadiusByNodeType);

            node.transition()
                .duration(2500)
                .style("opacity", 1)
                .style("stroke", "#ffffff");

            link.transition()
                .duration(3000)
                .style("opacity", 1);

            label.transition()
                .duration(3000)
                .style("opacity", 1);
        }
    }
    function addNodes(data) {
        var nodes = simulation.nodes();
        var links =  simulation.force("link").links();
        data.nodes.forEach(function (n, index) {
            if(!containsNode(n,nodes))
            nodes.push(n);
        });

        data.links.forEach(function (l, index) {
            if(!containsLink(l,links))
            links.push(l);
        });

        var result ={};
        result.nodes = nodes;
        result.links = links;
        return result;
    }
    function containsNode(obj, list) {
        var i;
        for (i = 0; i < list.length; i++) {
            if (list[i].id === obj.id) {
                return true;
            }
        }
        return false;
    }
    function containsLink(obj, list) {
        var i;
        for (i = 0; i < list.length; i++) {
            if (list[i].source.id === obj.source) {
                return true;
            }
        }
        return false;
    }

    function toggleLabel() {
        if(labelsOn){
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
    function update(data) {
        transitionPreviousItem();
       //  link = link.data(data.links, function(d) {
       //      return d.target.id; });
       //  node = node.data(data.nodes, function(d) {
       //      return d.id; });

        init(data, true);
        // link.exit().remove();
        // node.exit().remove();
        simulation.force("center", d3.forceCenter( expandLaunchPosition[0], expandLaunchPosition[1]));
       // updateHistoryButtons();
        // simulation.alpha(1).restart();
        simulation.start();
    }
    function updateNodeOptionsArray(graph) {
        optArray = [];
        for (var i = 0; i < graph.nodes.length - 1; i++) {
            var name = graph.nodes[i].name;
            if(optArray.indexOf(name) === -1)
            optArray.push(name);
        }
    }
    function setLaunchPoint(context) {
        var position = d3.mouse(context);
        if(!position){
            position[0] = width/2;
            position[1] = height/2;
        }
            expandLaunchPosition = position;
    }
    function getLaunchPoint(){
        return expandLaunchPosition  || [width/2,height/2];
    }
    function forceCluster(alpha) {
        var len = node._groups[0].length;
        node.each(function (n,i) {
            var k = alpha * 1;
            var cluster = clusters[n.cluster];
            n.vx -= (n.x - cluster.x) * k;
            n.vy -= (n.y - cluster.y) * k;
        });
    }
    function addZoom() {
        svg
        // .attr("width", "100%")
        // .attr("height", "100%")
            .call(d3.zoom()
                .on("zoom", rescale));
    }
    function addClusterDataToNodes(n) {
        n.each(function (d, i) {
            var cluster, radius = null,
                r = Math.sqrt((i + 1) / clusters.length * -Math.log(Math.random())) * 100;
            if(d.type === "son"){
                cluster = 0;
                radius = r;
            }else if(d.type === "friend"){
                cluster = 1;
                radius = r;
            }else if(d.type === "brother"|| d.type === "sister"){
                cluster = 3;
                radius = r;
            }
            else if(d.type === "stepsonson" || d.type === "stepdaughter"){
                cluster = 4;
                radius = r;
            }else if(d.type === "girlfriend" || d.type === "boyfriend"){
                cluster = 5;
                radius = r;
            }else if(d.type === "mother" || d.type === "father"){
                cluster = 6;
                radius = r;
            }else if(d.type === "son" || d.type === "daughter"){
                cluster = 7;
                radius = r;
            }
            else if(d.type === "brother"){
                cluster = 8;
                radius = r;
            }
            else{
                cluster = 2;
                radius = r;
            }
            if (!clusters[i] || (r > clusters[i].radius)) {
                clusters[i] = d;
            }
            d.cluster = cluster;
            d.radius = radius;

        });
    }
    function toggleChildren(d, key) {
        if (d3.event.defaultPrevented) return; // ignore drag
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }
        update(d);
    }
    // Returns a list of all nodes under the root.
    function flatten(root) {
        var nodes = [], i = 0;

        function recurse(node) {
            if (node.children) node.children.forEach(recurse);
            if (!node.id) node.id = ++i;
            nodes.push(node);
        }

        recurse(root);
        return nodes;
    }
    function restartForce(data) {
        update(data);
    }
    function transitionPreviousItem() {
        //node.exit().remove();
       node.style("fill-opacity", .01)
           .style("stroke-opacity", .01)
           .style("stroke", "#ebebeb")
           .attr("fill", "#ebebeb")
           .attr("visibility", "hidden")
           .attr("disabled", "true");

       link.style("stroke-opacity", .01)
           .style("stroke-opacity", .01)
           .attr("visibility", "hidden")
           .style("stroke", "#ebebeb")
           .attr("fill", "#efefef");

       label.style("stroke-opacity", .01)
           .style("stroke-opacity", .01)
           .attr("visibility", "hidden")
           .style("stroke", "#ebebeb")
           .attr("fill", "#efefef");
   }
    function sanitize(graph) {
        if(graph.links.length > 0)
        graph.links = graph.links.filter(function (currentValue) {
            return currentValue !== null;
        });
        if(graph.nodes.length > 0)
        graph.nodes = graph.nodes.filter(function (currentValue) {
            return currentValue !== null;
        });
    }
    function contextMenu(that, newContext) {
        d3.event.preventDefault();

        var position = d3.mouse(that);
        d3.select('#context-menu')
            .style('position', 'absolute')
            .style('left', (position[0] + 10) + "px")
            .style('top', (position[1] + 60) + "px")
            .style('display', 'inline-block')
            .on('mouseleave', function() {
                d3.select('#context-menu').style('display', 'none');
                context = null;
            });

        setLaunchPoint(that);

        d3.select('#ctext-edit').on('click', function () {
            console.log('edit clicked..');
            console.log(selectedNode);
        });
        d3.select("#ctext-exp").on('click', function (n) {
            console.log('expanding ' + selectedNode);
            handleExpand();
        })
        d3.select("#ctext-coll").on('click', function (n) {
            console.log('collapsing ' +  selectedNode);


            handleCollapse();
        })
    }

    function collapseChildren(id) {
        // nodes = node.filter(function (n,i) {
        //     return n.source === id;
        // })
        node.forEach(function (n, i) {
            if(n.source.id === id){
                n.style('visibility', 'gone')
            }
        })
    }

    function addToHistory() {
        var local = getLocal("nav_history");
        if(local === null){
            local = [];
        }
        if(!local.contains(selectedNode.id)){
            local.push(selectedNode.id);
        }
        saveLocal("nav_history",local);
    }

    function getLastIdFromHistory() {
        var local = getLocal("nav_history"),
        last = null;
        if(local === null){
            local = [];
        }
            last =  local.pop();
        saveLocal("nav_history",local);
        return last
    }
    function createIndexedLinks(graph) {
        graph.links.forEach(function (d) {
            linkedByIndex[d.source + "," + d.target] = 1;
        });
    }
    function isNodeConnected(a, b) {
        return linkedByIndex[a.index + "," + b.index] || linkedByIndex[b.index + "," + a.index] || a.index === b.index;
    }
    function rescale() {
        svg.attr("transform", d3.event.transform)
    }
    function getStrokeWidthByNodeGroup(d){
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
                return 15;
        //    }
        //}
    }
    function getStrokeWidthByLinkType(d){
        if(!d){
            return false;
        }
        var type = d.type;
        switch (type){
            case 'third': {
               return 1.20;
            }
            case 'connection':{
                return 1.20;
            }
            case 'bad':{
                return 1.20;
            }
            default:{
                return 1.20;
            }
        }
    }
    function getNodeRadiusByNodeType(d) {
        if (!d) {
            return false;
         }
        if (d.type === "brother"||d.type === "sister" || d.type === "father" || d.type === "mother") {
            return 12;
          }
        else if (d.type === "cousin") {
            return 15;
           }
        else if (d.type === "girlfriend" || d.type === "boyfriend"){
            return 10;
            }
        else if (d.type === "friend"){
            return 8;
        }
        else if (d.type === "son" || d.type === "daughter"){
            return 15;
        }
        else if (d.type === "stepson" || d.type === "stepdaughter"){
            return 18;
        }
        return 15; //self
    }
    function expandNodeRadius(d) {
        if(!d){
            return false;
        }
            return getNodeRadiusByNodeType(d)*1.2;
    }
    function getFillColorForNode(d) {
        if (!d) {
            return false;
        }
        return colorMapping[d.type];
    }
    function getColorForNode(d) {
       return '#9f9f9f'; //colors[d.group];
    }
    function getLinkDistanceByConnectionType(item) {
        if(!item){
            return false;
        }
        var type = item.type;

        if (type === "father" || type === "mother"||type === "girlfriend" || type === "boyfriend") {
            return 75;
        }
        else if (type === "son" || type === "daughter") {
            return 175;
        }
        else if (type === "stepson" || type === "stepdaughter") {
            return 205;
        }
        else{
            return 105
        }
    }
    function getLinkColor(l){
          if(!l){
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
    function dragstarted(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
        }
    function dragended(d) {
        d.fixed = true;
        // if (!d3.event.active) simulation.alphaTarget(0);
        // d.fx = null;
        // d.fy = null;
    }
    function releasenode(d) {
        d.fixed = false;
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    var linkMap = {
        1 : {url : "0/Horatio/"},
        2 : {url : "7/Remy/"},
        3 : {url : "8/Cohen/"},
        4: {url : "7/Remy/"},
        5 : {url : "1/Jessica/"},
        6: {url :"2/Gary/"},
        7: {url :"2/Aaron/"},
        8 : {url :"2/Sean/"},
        8: {url :"2/Abby/"},
        10: {url :"2/Dee/"},
        Rachel : "11",
        Jhanell : "12",
        lulu : "13",
        Stacy: "14",
        Juani : "15",
        Kali :"16",
        Niggy: "17",
        Chelsea: "18",
        Chloe: "19",
        Maka: "20",
        Crystal :"21",
        Doc: "22",
        Hatcher : "23"


    };

    function getAssociations() {
        fbase.child("associations").limit(1000).once("value", function(data) {
            var value = data.val();
            var key = value.key;
            buildHierarchy();
        });
    }

    function buildHierarchy(data) {
        var id = "id",
            comma = ",",
            rootIdVal = "",
            nodeLabel = "Children",
            lcbracket = "{",
            rcbracket = "}",
            lbrace = "[",
            rbrace = "]",
            colon = ":";

        var structure = lcbracket +
            Id + colon +
            rootIdVal + comma + nodeLabel + colon + lbrace +
            lcbracket + id + colon ;
    }

});
