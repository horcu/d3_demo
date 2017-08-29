$(function () {
    var fbase = new Firebase('https://d3-testbed.firebaseio.com/links-nodes'),
        svg = d3.select("svg"),
        // tip = d3.tip()
        // .attr('class', 'd3-tip')
        // .offset([-10, 0])
        // .html(function(d) {
        //     return "<strong> <span style='color:red'>" + d.name + "</span></strong>";
        // }),
        linksPath = "/links",
        nodesPath = "/nodes",
        faded = false,
        width = +svg.attr("width"),
        height = +svg.attr("height"),
        link = null,
        node = null,
        existingBtnIds = [],
        expandLaunchPosition = [],
        //this would init to the first selected item's unique id then get updated accordingly.
        // ideally its an array since we will allow multi selection of the nodes to expand
        mainItemId = ['001'],
        itemSet = {},
        linkedByIndex = {},
        form = d3.select("#btn-container")
        .append("form"),
        selectedNode = {},
        itemKey = 'link-nodes-json',
        ttDiv = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0),
        optArray = [],
        savedItems = localStorage.getItem(itemKey),
        selectedLabelIndex = null,
        colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#6C2BBD", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"],
        simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(function(d) { return d.id; }).distance(getLinkDistanceByConnectionType).strength(.25))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(width / 2, height / 2));

    svg.append("defs").selectAll("marker")
        .data(["suit", "licensing", "resolved"])
        .enter().append("marker")
        .attr("id", function(d) { return d; })
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


      //  svg.call(zoom);
    //TODO - REMOVE

    var khasruUrl = "https://d3-testbed.firebaseio.com/links-nodes/khasru.json",
        horatioUrl = "https://d3-testbed.firebaseio.com/links-nodes/horatio.json";

    //TODO END REMOVE

   // svg.call(tip);
    d3.json(khasruUrl, function(error, graph) {
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

    function setSelectedNode(node) {
        selectedNode = node;
    }

    function initializeLocalStorage(graph) {
        itemSet[mainItemId[0]] = graph;
        saveLocal(itemKey, itemSet);
    }

    function handleExpand(){
        path = '/' + selectedNode.name + '/';

        getLinkedData(path);
    }

    function getLinkedData(path) {
        var firebaseRef = fbase.child(path).ref();
        firebaseRef.once('value', function(snapshot) {
            var data = snapshot.val();
            if(data === null)
                return false;

          switchTo(selectedNode.id, data);
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

    $('#flush').on('click', function () {
      flushLocal();
      alert('local storag cleared');
    });

    var searchBtn = $('#search-btn');


    searchBtn.hover( function () {
        $(this).css("cursor", "pointer");
    }, function () {
        $(this).css("cursor", "default");
    });
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

    function updateNodeOptionsArray(graph) {
        for (var i = 0; i < graph.nodes.length - 1; i++) {
            optArray.push(graph.nodes[i].name);
        }
    }

    function init(graph, update) {
        if(update){
            link.exit().remove();
            node.exit().remove();
        }

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

         link = svg.append("g")
             .attr("class", 'links')
             .selectAll("line")
             .data(graph.links)
             .enter().append("line")
             .style("stroke", getLinkColor)
             .style("marker-end",  "url(#resolved)")
             .attr("stroke-width", getStrokeWidthByLinkType);

          node = svg.append("g")
              .attr("class", "nodes")
              .selectAll("circle")
              .data(graph.nodes)
              .enter().append("circle")
              .attr("r", getNodeRadiusByNodeType)
              .style('stroke', getColorForNode)
              .attr('stroke-width', getStrokeWidthByNodeGroup)
              .attr("fill", getFillColorForNode)
              .call(d3.drag()
                  .on("start", dragstarted)
                  .on("drag", dragged)
                  .on("end", dragended))
              .on('click', releasenode)
              .on('dblclick', toggleFade(.1))
              .on("mouseover", function(d) {
                  this.setAttribute("style", "stroke: #222222");
                  ttDiv.transition()
                      .duration(200)
                      .style("opacity", .9);
                  ttDiv.html(d.name)
                      .style("left", (d3.event.pageX + 10) + "px")
                      .style("top", (d3.event.pageY - 30) + "px");
              })
              .on("mouseout", function(d) {
                  this.setAttribute("style", "stroke:" + getColorForNode(d) + ";");
                  ttDiv.transition()
                      .duration(500)
                      .style("opacity", 0);
              })
              .on("contextmenu", function (data, index) {
                  setSelectedNode(data);
                  d3.select('#context-menu').style('display', 'block');
                  contextMenu(this, 'rect');
                  d3.event.preventDefault();
              });

         // node.append("title")
         //     .text(function(d) { return d.name; });

        simulation
            .nodes(graph.nodes)
            .on("tick", ticked);

        simulation.force("link")
            .links(graph.links);

        if (graph.links.length > 0) {
            createIndexedLinks(graph);
        }

        if(update){
            simulation
                .force("center", d3.forceCenter( expandLaunchPosition[0], expandLaunchPosition[1]));

            //todo - here find the node that is at the center of the search and pin it in place with d.fixed = true;
            updateHistoryButtons();
        }

        searchBtn.on('click', function () {
            searchNode(node, link);
        });

        function ticked() {
            // var k = .25;
            // node.each(function(o, i) {
            //     o.y += i & 1 ? k : -k;
            //     o.x += i & 2 ? k : -k;
            // });

            link
                .attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });

            node
                .attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; });
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

        function searchNode(node, link) {
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
                }).style("stroke", "#222222")
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
            }
        }
    }

    function update(data, key) {
        transitionPreviousItem();
        init(data, true, key);
    }
    function switchTo(key, data) {
        sanitize(data);
        update(data, key);
    }
    function transitionPreviousItem() {
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
   }
    function sanitize(graph) {
        graph.links = graph.links.filter(function (currentValue) {
            return currentValue !== null;
        });
        graph.nodes = graph.nodes.filter(function (currentValue) {
            return currentValue !== null;
        });

        // d3.select('.nodes').remove();
        // d3.select('.links').remove();
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
        expandLaunchPosition = position;

        d3.select('#ctext-edit').on('click', function () {
            console.log('edit clicked..');
            console.log(selectedNode);
        });
        d3.select("#ctext-exp").on('click', function (n) {
            console.log(selectedNode);
            handleExpand();
        })
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
        if(!d){
            return false;
        }
        if(d.group === 6)
            return 25;
        return 10;
    }
    function expandNodeRadius(d) {
        if(!d){
            return false;
        }
            return getNodeRadiusByNodeType(d)*1.2;
    }
    function getFillColorForNode(d) {
        if(!d){
            return false;
        }
       // if(d.group === 4)
            return colors[d.group];
       // return '#ffffff';
    }
    function getColorForNode(d) {
       return '#9f9f9f'; //colors[d.group];
    }
    function getLinkDistanceByConnectionType(item) {
        if(!item){
            return false;
        }
        var type = item.type;

        if (type === "bad") {
            return 75;
        }
        else if (type === "third") {
            return 175;
        }
        else{
            return 105
        }
    }
    function getLinkColor(l){
          if(!l){
              return false;
          }

        type = l.type;
        switch (type){
            case 'bad' :{
               return colors[3];
            }
            case 'connection':{
               return colors[0];
            }
            case 'third' : {
               return colors[8];
            }
            default:{
                return colors[7];
            }
        }
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
});
