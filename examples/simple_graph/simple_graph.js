var Drawing = Drawing || {};

Drawing.SimpleGraph = function(options) {
  options = options || {};
  
  this.layout = options.layout || "2d";
  this.layout_options = options.graphLayout || {};
  this.show_stats = options.showStats || false;
  this.show_info = options.showInfo || false;
  this.show_labels = options.showLabels || false;
  this.selection = options.selection || false;
  this.limit = options.limit || 100;
  this.nodes_count = options.numNodes || 31;
  this.edges_count = options.numEdges || 200; 

  var camera, controls, scene, renderer, interaction, geometry, object_selection;
  var stats;
  var info_text = {};
  var graph = new GRAPHVIS.Graph({limit: this.limit});
  
  var geometries = [];
  
  var that = this;

  var usedImages = [];
  for (var i = 0; i < this.nodes_count; i++) {
    usedImages.push(i % 31);
  }
  shuffleArray(usedImages);
  
  init();
  createGraph();
  animate();

  function init() {
    renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    camera = new THREE.PerspectiveCamera(40, window.innerWidth/window.innerHeight, 10, 1000000);
    camera.position.z = 15000;
    
    controls = new THREE.TrackballControls(camera);
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 5.2;
    controls.panSpeed = 1;
    controls.noZoom = true;
    controls.noPan = false;
    controls.staticMoving = false;
    controls.dynamicDampingFactor = 0.3;
    controls.keys = [65, 83, 68];
    controls.minDistance = 1000;
    controls.maxDistance = 100000;
    controls.addEventListener('change', render);
    scene = new THREE.Scene();
    
    if(that.layout === "3d") {
      geometry = new THREE.SphereGeometry(300);
    } else {
      geometry = new THREE.BoxGeometry(50, 50, 0);
    }
    
    if(that.selection) {
      object_selection = new THREE.ObjectSelection({
        domElement: renderer.domElement,
        selected: function(obj) {
          if(obj !== null) {
            info_text.select = "Object " + obj.id;
          } else {
            delete info_text.select;
          }
        },
        clicked: function(obj) {
          if(obj) {
            showImagePopup(obj.material.map.image.src);
          }
        }
      });
    }
    
    document.body.appendChild(renderer.domElement);
    
    if(that.show_stats) {
      stats = new Stats();
      stats.domElement.style.position = 'absolute';
      stats.domElement.style.top = '0px';
      document.body.appendChild(stats.domElement);
    }
    
    if(that.show_info) {
      var info = document.createElement("div");
      var id_attr = document.createAttribute("id");
      id_attr.nodeValue = "graph-info";
      info.setAttributeNode(id_attr);
      info.style.position = 'absolute';
      info.style.top = '5px';
      info.style.left = '5px';
      info.style.color = '#fff';
      document.body.appendChild(info);
    }
    
    window.addEventListener('resize', onWindowResize, false);
  }

  function createGraph() {
    var numNodes = that.nodes_count;
    var numEdges = that.edges_count;

    var nodes = [];
    for (var i = 0; i < numNodes; i++) {
      var node = new GRAPHVIS.Node(i);
      node.data.title = "Node " + node.id;
      graph.addNode(node);
      drawNode(node, usedImages[i]);
      nodes.push(node);
    }

    for (var e = 0; e < numEdges; e++) {
      var idx1 = Math.floor(Math.random() * numNodes);
      var idx2 = Math.floor(Math.random() * numNodes);
      if (idx1 !== idx2) {
        var node1 = nodes[idx1];
        var node2 = nodes[idx2];
        if (graph.addEdge(node1, node2)) {
          drawEdge(node1, node2);
        }
      }
    }

    that.layout_options.width = that.layout_options.width || 5000;
    that.layout_options.height = that.layout_options.height || 5000;
    that.layout_options.iterations = that.layout_options.iterations || 100000;
    that.layout_options.layout = that.layout_options.layout || that.layout;
    graph.layout = new Layout.ForceDirected(graph, that.layout_options);
    graph.layout.init();
    info_text.nodes = "Nodes " + graph.nodes.length;
    info_text.edges = "Edges " + graph.edges.length;
  }

  function drawNode(node, imgIndex) {
    var textureLoader = new THREE.TextureLoader();
    var texture = textureLoader.load('img/' + imgIndex + '.JPG');
    var material = new THREE.MeshBasicMaterial({
      map: texture,
      opacity: 0.8
    });

    var draw_object = new THREE.Mesh(geometry, material);
    var label_object;
    
    if(that.show_labels) {
      if(node.data.title !== undefined) {
        label_object = new THREE.Label(node.data.title);
      } else {
        label_object = new THREE.Label(node.id);
      }
      node.data.label_object = label_object;
      scene.add(node.data.label_object);
    }

    var area = 10000;
    draw_object.position.x = Math.floor(Math.random() * (area + area + 1) - area);
    draw_object.position.y = Math.floor(Math.random() * (area + area + 1) - area);
    
    if(that.layout === "3d") {
      draw_object.position.z = Math.floor(Math.random() * (area + area + 1) - area);
    }

    draw_object.id = node.id;
    node.data.draw_object = draw_object;
    node.position = draw_object.position;
    scene.add(node.data.draw_object);
  }

  function drawEdge(source, target) {
    var material = new THREE.LineBasicMaterial({ color: 0xFF0000 }); // red lines
    var tmp_geo = new THREE.Geometry();
    tmp_geo.vertices.push(source.data.draw_object.position);
    tmp_geo.vertices.push(target.data.draw_object.position);
    var line = new THREE.LineSegments(tmp_geo, material);
    line.scale.x = line.scale.y = line.scale.z = 1;
    line.originalScale = 1;
    line.frustumCulled = false;
    geometries.push(tmp_geo);
    scene.add(line);
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    render();
    if(that.show_info) {
      printInfo();
    }
  }

  function render() {
    if(!graph.layout.finished) {
      info_text.calc = "<span style='color: red'>Calculating layout...</span>";
      graph.layout.generate();
    } else {
      info_text.calc = "";
    }

    for(var i = 0; i < geometries.length; i++) {
      geometries[i].verticesNeedUpdate = true;
    }

    if(that.show_labels) {
      var length = graph.nodes.length;
      for(var i = 0; i < length; i++) {
        var node = graph.nodes[i];
        if(node.data.label_object !== undefined) {
          node.data.label_object.position.x = node.data.draw_object.position.x;
          node.data.label_object.position.y = node.data.draw_object.position.y - 100;
          node.data.label_object.position.z = node.data.draw_object.position.z;
          node.data.label_object.lookAt(camera.position);
        } else {
          var label_object;
          if(node.data.title !== undefined) {
            label_object = new THREE.Label(node.data.title, node.data.draw_object);
          } else {
            label_object = new THREE.Label(node.id, node.data.draw_object);
          }
          node.data.label_object = label_object;
          scene.add(node.data.label_object);
        }
      }
    } else {
      var length = graph.nodes.length;
      for(var i = 0; i < length; i++) {
        var node = graph.nodes[i];
        if(node.data.label_object !== undefined) {
          scene.remove(node.data.label_object);
          node.data.label_object = undefined;
        }
      }
    }

    if(that.selection) {
      object_selection.render(scene, camera);
    }

    if(that.show_stats) {
      stats.update();
    }

    renderer.render(scene, camera);
  }

  function printInfo() {
    var txt = "<div style='padding-top: 10px;'>";
    if(that.show_info) {
      for(var key in info_text) {
        if(info_text.hasOwnProperty(key)) {
          txt += "<div>" + info_text[key] + "</div>";
        }
      }
    }
    txt += "</div>";
    var infoDiv = document.getElementById("graph-info");
    if(infoDiv) {
      infoDiv.innerHTML = txt;
    }
  }

  function showImagePopup(imageSrc) {
    var popup = document.createElement("div");
    var popupWidth = Math.min(window.innerWidth * 0.8, 800);
    var popupHeight = Math.min(window.innerHeight * 0.8, 600);
    var randomTop = Math.floor(Math.random() * (window.innerHeight - popupHeight)) + "px";
    var randomLeft = Math.floor(Math.random() * (window.innerWidth - popupWidth)) + "px";

    popup.style.position = "absolute";
    popup.style.top = randomTop;
    popup.style.left = randomLeft;
    popup.style.padding = "10px";
    popup.style.background = "rgba(0,0,0,0.8)";
    popup.style.border = "1px solid #ccc";
    popup.style.zIndex = "9999";
    popup.style.maxWidth = popupWidth + "px";
    popup.style.maxHeight = popupHeight + "px";
    popup.style.overflow = "auto";
    popup.style.display = "flex";
    popup.style.alignItems = "center";
    popup.style.justifyContent = "center";

    var closeBtn = document.createElement("div");
    closeBtn.innerHTML = "&#10006;";
    closeBtn.style.position = "absolute";
    closeBtn.style.top = "0px";
    closeBtn.style.right = "0px";
    closeBtn.style.color = "#fff";
    closeBtn.style.cursor = "pointer";
    closeBtn.style.fontSize = "20px";
    closeBtn.onclick = function() {
      if(document.body.contains(popup)){
        document.body.removeChild(popup);
      }
    };

    var img = document.createElement("img");
    img.src = imageSrc;
    img.style.maxWidth = "100%";
    img.style.maxHeight = "100%";
    img.style.cursor = "pointer";
    img.onclick = function() {
      if(document.body.contains(popup)){
        document.body.removeChild(popup);
      }
    };

    popup.appendChild(closeBtn);
    popup.appendChild(img);
    document.body.appendChild(popup);
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
  }

  // Utility function to shuffle array
  function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
  }
};
