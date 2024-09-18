var Drawing = Drawing || {};

Drawing.SimpleGraph = function(options) {
  options = options || {};

  this.layout = options.layout || "2d";
  this.layout_options = options.graphLayout || {};
  this.show_stats = options.showStats || false;
  this.show_info = options.showInfo || false;
  this.show_labels = options.showLabels || false;
  this.selection = options.selection || false;
  this.limit = options.limit || 39; // updated limit for 39 nodes
  this.nodes_count = options.numNodes || 39; // updated number of nodes to 39
  this.edges_count = options.numEdges || 4;

  var camera, controls, scene, renderer, interaction, geometry, object_selection;
  var stats;
  var info_text = {};
  var graph = new GRAPHVIS.Graph({limit: options.limit});

  var geometries = [];

  var that = this;

  init();
  createGraph();
  animate();

  function init() {
    // Three.js initialization
    renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 1000000);
    camera.position.z = 10000;

    controls = new THREE.TrackballControls(camera);

    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 5.2;
    controls.panSpeed = 1;

    controls.noZoom = false;
    controls.noPan = false;

    controls.staticMoving = false;
    controls.dynamicDampingFactor = 0.3;

    controls.keys = [65, 83, 68];

    controls.minDistance = 2;

    controls.addEventListener('change', render);

    scene = new THREE.Scene();

    // Node geometry
    if (that.layout === "2d") {
      geometry = new THREE.SphereGeometry(100); // node size
    } else {
      geometry = new THREE.BoxGeometry(1000, 1000, 0);
    }

    // Array of images for node textures
    var images = [];
    for (var i = 1; i <= 39; i++) {
      images.push('img/' + i + '.JPG');
    }

    // Create node selection, if set
    if (that.selection) {
      object_selection = new THREE.ObjectSelection({
        domElement: renderer.domElement,
        selected: function (obj) {
          // display info
          if (obj !== null) {
            info_text.select = "Object " + obj.id;
          } else {
            delete info_text.select;
          }
        },
        clicked: function (obj) {
        }
      });
    }

    document.body.appendChild(renderer.domElement);

    // Stats.js
    if (that.show_stats) {
      stats = new Stats();
      stats.domElement.style.position = 'absolute';
      stats.domElement.style.top = '0px';
      document.body.appendChild(stats.domElement);
    }

    // Create info box
    if (that.show_info) {
      var info = document.createElement("div");
      var id_attr = document.createAttribute("id");
      id_attr.nodeValue = "graph-info";
      info.setAttributeNode(id_attr);
      document.body.appendChild(info);
    }
  }


  /**
   *  Creates a graph with random nodes and edges.
   *  Number of nodes and edges can be set with
   *  numNodes and numEdges.
   */
  function createGraph() {
    var node = new GRAPHVIS.Node(0);
    node.data.title = "This is node " + node.id;
    graph.addNode(node);
    drawNode(node, 0); // pass index 0 for the first image

    var nodes = [];
    nodes.push(node);

    var steps = 1;
    while (nodes.length !== 0 && steps < that.nodes_count) {
      node = nodes.shift();

      var numEdges = randomFromTo(1, that.edges_count);
      for (var i = 1; i <= numEdges; i++) {
        var target_node = new GRAPHVIS.Node(i * steps);
        if (graph.addNode(target_node)) {
          target_node.data.title = "This is node " + target_node.id;

          drawNode(target_node, steps); // pass the current step as the image index
          nodes.push(target_node);
          if (graph.addEdge(node, target_node)) {
            drawEdge(node, target_node);
          }
        }
      }
      steps++;
    }

    that.layout_options.width = that.layout_options.width || 2000;
    that.layout_options.height = that.layout_options.height || 2000;
    that.layout_options.iterations = that.layout_options.iterations || 100;
    that.layout_options.layout = that.layout_options.layout || that.layout;
    graph.layout = new Layout.ForceDirected(graph, that.layout_options);
    graph.layout.init();
    info_text.nodes = "Nodes " + graph.nodes.length;
    info_text.edges = "Edges " + graph.edges.length;
  }


  /**
   *  Create a node object and add it to the scene.
   *  Each node will have a different texture based on the images array.
   */
  function drawNode(node, index) {
    var texture = THREE.ImageUtils.loadTexture('img/' + (index % 39 + 1) + '.JPG'); // select image based on index
    var material = new THREE.MeshBasicMaterial({map: texture, transparent: true});
    var draw_object = new THREE.Mesh(geometry, material);
    var label_object;

    if (that.show_labels) {
      if (node.data.title !== undefined) {
        label_object = new THREE.Label(node.data.title);
      } else {
        label_object = new THREE.Label(node.id);
      }
      node.data.label_object = label_object;
      scene.add(node.data.label_object);
    }

    var area = 3000; // distance?
    draw_object.position.x = Math.floor(Math.random() * (area + area + 1) - area);
    draw_object.position.y = Math.floor(Math.random() * (area + area + 1) - area);
    if (that.layout === "3d") {
      draw_object.position.z = Math.floor(Math.random() * (area + area + 1) - area);
    }

    draw_object.id = node.id;
    node.data.draw_object = draw_object;
    node.position = draw_object.position;
    scene.add(node.data.draw_object);
  }


  /**
   *  Create an edge object (line) and add it to the scene.
   */
  function drawEdge(source, target) {
    material = new THREE.LineBasicMaterial({color: 0xFF0000});

    var tmp_geo = new THREE.Geometry();
    tmp_geo.vertices.push(source.data.draw_object.position);
    tmp_geo.vertices.push(target.data.draw_object.position);

    line = new THREE.LineSegments(tmp_geo, material);
    line.scale.x = line.scale.y = line.scale.z = 1;
    line.originalScale = 1;

    // NOTE: Deactivated frustumCulled, otherwise it will not draw all lines (even though
    // it looks like the lines are in the view frustum).
    line.frustumCulled = false;

    geometries.push(tmp_geo);

    scene.add(line);
  }


  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    render();
    if (that.show_info) {
      printInfo();
    }
  }


  function render() {
    var i, length, node;

    // Generate layout if not finished
    if (!graph.layout.finished) {
      info_text.calc = "<span style='color: red'>Calculating layout...</span>";
      graph.layout.generate();
    } else {
      info_text.calc = "";
    }

    // Update position of lines (edges)
    for (i = 0; i < geometries.length; i++) {
      geometries[i].verticesNeedUpdate = true;
    }


    // Show labels if set
    if (that.show_labels) {
      length = graph.nodes.length;
      for (i = 0; i < length; i++) {
        node = graph.nodes[i];
        if (node.data.label_object !== undefined) {
          node.data.label_object.position.x = node.data.draw_object.position.x;
          node.data.label_object.position.y = node.data.draw_object.position.y - 100;
          node.data.label_object.position.z = node.data.draw_object.position.z;
          node.data.label_object.lookAt(camera.position);
        } else {
          var label_object;
          if (node.data.title !== undefined) {
            label_object = new THREE.Label(node.data.title, node.data.draw_object);
          } else {
            label_object = new THREE.Label(node.id, node.data.draw_object);
          }
          node.data.label_object = label_object;
          scene.add(node.data.label_object);
        }
      }
    } else {
      length = graph.nodes.length;
      for (i = 0; i < length; i++) {
        node = graph.nodes[i];
        if (node.data.label_object !== undefined) {
          scene.remove(node.data.label_object);
          node.data.label_object = undefined;
        }
      }
    }

    // render selection
    if (that.selection) {
      object_selection.render(scene, camera);
    }

    renderer.render(scene, camera);
    if (that.show_stats) {
      stats.update();
    }
  }


  function randomFromTo(from, to) {
    return Math.floor(Math.random() * (to - from + 1) + from);
  }

  /**
   *  Prints some info about graph and layout.
   */
  function printInfo() {
    var str = "";
    for (var key in info_text) {
      if (Object.prototype.hasOwnProperty.call(info_text, key)) {
        str += info_text[key] + " ";
      }
    }
    document.getElementById("graph-info").innerHTML = str;
  }
};