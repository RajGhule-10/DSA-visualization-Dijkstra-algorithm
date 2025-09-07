let nodes = [];
let edges = [];
let mode = null;
let selectedNode = null;
let startNode = null;
let endNode = null;

let dijkstraRunning = false;
let distances = {};
let previous = {};
let pq = [];
let visited = {};
let pathReconstructed = false;

let speedSlider;
let shortestPath = [];
let pathAnimation = false;
let currentPathIndex = 0;
let lastPathTime = 0;

class Node {
  constructor(x, y) {
    this.id = nodes.length;
    this.label = String.fromCharCode(65 + this.id); // A-Z
    this.x = x;
    this.y = y;
    this.isInPath = false;
    this.isCurrentlyAnimated = false;
  }

  draw() {
    // Animation effect for current node in path
    if (this.isCurrentlyAnimated) {
      fill(255, 215, 0); // Gold for currently animated node
      stroke(255, 0, 0);
      strokeWeight(4);
      // Pulsing effect
      let pulseSize = 45 + sin(frameCount * 0.3) * 5;
      ellipse(this.x, this.y, pulseSize, pulseSize);
    }
    // Highlight path nodes
    else if (this.isInPath) {
      fill(255, 165, 0); // Orange for path nodes
      stroke(255, 0, 0);
      strokeWeight(3);
      ellipse(this.x, this.y, 45, 45);
    }
    // Highlight selected node
    else if (this === selectedNode && mode === "addEdge") {
      fill("orange");
      stroke(255, 0, 0);
      strokeWeight(3);
      ellipse(this.x, this.y, 40, 40);
    } 
    // Start node
    else if (this === startNode) {
      fill(0, 255, 0); // Bright green
      stroke(0);
      strokeWeight(2);
      ellipse(this.x, this.y, 40, 40);
    } 
    // End node
    else if (this === endNode) {
      fill(255, 0, 0); // Bright red
      stroke(0);
      strokeWeight(2);
      ellipse(this.x, this.y, 40, 40);
    } 
    // Regular nodes
    else {
      fill(173, 216, 230); // Light blue
      stroke(0);
      strokeWeight(2);
      ellipse(this.x, this.y, 40, 40);
    }

    // Node label
    fill(0);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(16);
    textStyle(BOLD);
    text(this.label, this.x, this.y);
  }

  isMouseOver() {
    return dist(mouseX, mouseY, this.x, this.y) < 20;
  }
}

class Edge {
  constructor(a, b, weight) {
    this.a = a;
    this.b = b;
    this.weight = weight;
    this.isInPath = false;
  }

  draw() {
    // Highlight edges in shortest path
    if (this.isInPath) {
      stroke(255, 0, 0); // Red for path edges
      strokeWeight(6);
    } else {
      stroke(0);
      strokeWeight(3);
    }
    
    line(this.a.x, this.a.y, this.b.x, this.b.y);

    // Calculate position for weight label - offset from middle
    let midX = (this.a.x + this.b.x) / 2;
    let midY = (this.a.y + this.b.y) / 2;
    
    // Calculate perpendicular offset for better visibility
    let dx = this.b.x - this.a.x;
    let dy = this.b.y - this.a.y;
    let length = sqrt(dx * dx + dy * dy);
    let offsetX = (-dy / length) * 15; // Perpendicular offset
    let offsetY = (dx / length) * 15;
    
    let labelX = midX + offsetX;
    let labelY = midY + offsetY;

    // Draw background for weight label
    fill(255, 255, 255, 200); // Semi-transparent white background
    stroke(0);
    strokeWeight(1);
    
    // Calculate text width properly
    textSize(14);
    let weightText = String(this.weight);
    let txtWidth = textWidth(weightText) + 8;
    
    rect(labelX - txtWidth/2, labelY - 10, txtWidth, 20, 5);
    
    // Draw weight text
    fill(this.isInPath ? color(255, 0, 0) : color(0, 0, 255)); // Red if in path, blue otherwise
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(14);
    textStyle(BOLD);
    text(this.weight, labelX, labelY);
  }
}

function setup() {
  let container = document.getElementById("canvas-container");
  let canvas = createCanvas(windowWidth - 250, windowHeight);
  canvas.parent("canvas-container");
  speedSlider = document.getElementById("speedSlider");
}

function windowResized() {
  resizeCanvas(windowWidth - 250, windowHeight);
}

function draw() {
  background(245, 245, 245);
  
  // Draw edges first (so they appear behind nodes)
  edges.forEach(e => e.draw());
  
  // Draw live edge preview when in addEdge mode and a node is selected
  if (mode === "addEdge" && selectedNode && mouseX >= 0 && mouseY >= 0) {
    stroke(255, 0, 0); // Red color for preview
    strokeWeight(2);
    setLineDash([5, 5]); // Dashed line
    line(selectedNode.x, selectedNode.y, mouseX, mouseY);
    setLineDash([]); // Reset to solid line
  }
  
  // Draw nodes
  nodes.forEach(n => n.draw());

  // Handle Dijkstra animation
  if (dijkstraRunning && frameCount % (61 - speedSlider.value) === 0) {
    runDijkstraStep();
  }
  
  // Handle path animation
  if (pathAnimation && millis() - lastPathTime > 500) { // 500ms delay between nodes
    animatePathStep();
  }
}

// Helper function to create dashed lines
function setLineDash(dash) {
  drawingContext.setLineDash(dash);
}

function mousePressed() {
  if (mouseX < 0 || mouseY < 0) return;

  if (mode === "addNode") {
    nodes.push(new Node(mouseX, mouseY));
  } else if (mode === "addEdge") {
    for (let n of nodes) {
      if (n.isMouseOver()) {
        if (!selectedNode) {
          selectedNode = n;
          document.getElementById("info-box").innerHTML = `Selected node ${n.label}. Click another node to create edge.`;
        } else if (n !== selectedNode) {
          let w = prompt(`Enter weight for edge ${selectedNode.label} → ${n.label}:`, "1");
          if (w !== null) {
            w = parseInt(w);
            if (!isNaN(w) && w > 0) {
              edges.push(new Edge(selectedNode, n, w));
              document.getElementById("info-box").innerHTML = `Edge created: ${selectedNode.label} → ${n.label} (weight: ${w})`;
            } else {
              alert("Enter valid positive number!");
            }
          }
          selectedNode = null;
        } else {
          selectedNode = null;
          document.getElementById("info-box").innerHTML = "Node deselected. Click a node to start creating an edge.";
        }
        break;
      }
    }
    
    if (selectedNode) {
      let clickedOnNode = false;
      for (let n of nodes) {
        if (n.isMouseOver()) {
          clickedOnNode = true;
          break;
        }
      }
      if (!clickedOnNode) {
        selectedNode = null;
        document.getElementById("info-box").innerHTML = "Node deselected. Click a node to start creating an edge.";
      }
    }
  } else if (mode === "moveNode") {
    for (let n of nodes) {
      if (n.isMouseOver()) {
        selectedNode = n;
        break;
      }
    }
  } else if (mode === "pickStart") {
    for (let n of nodes) {
      if (n.isMouseOver()) {
        startNode = n;
        document.getElementById("info-box").innerHTML = `Start node set to ${n.label}`;
        break;
      }
    }
  } else if (mode === "pickEnd") {
    for (let n of nodes) {
      if (n.isMouseOver()) {
        endNode = n;
        document.getElementById("info-box").innerHTML = `End node set to ${n.label}`;
        break;
      }
    }
  }
}

function mouseDragged() {
  if (mode === "moveNode" && selectedNode) {
    selectedNode.x = mouseX;
    selectedNode.y = mouseY;
  }
}

function mouseReleased() {
  if (mode === "moveNode") {
    selectedNode = null;
  }
}

function setMode(m) {
  mode = m;
  selectedNode = null;

  let buttons = document.querySelectorAll(".top-bar button");
  buttons.forEach(btn => btn.classList.remove("active"));

  let buttonMap = {
    addNode: "Add Node",
    addEdge: "Add Edge",
    moveNode: "Move Node",
    pickStart: "Pick Start",
    pickEnd: "Pick End",
  };
  let btn = Array.from(buttons).find(b => b.innerText === buttonMap[m]);
  if (btn) btn.classList.add("active");
  
  let infoBox = document.getElementById("info-box");
  switch(m) {
    case "addNode":
      infoBox.innerHTML = "Click anywhere to add a new node.";
      break;
    case "addEdge":
      infoBox.innerHTML = "Click a node to start creating an edge.";
      break;
    case "moveNode":
      infoBox.innerHTML = "Click and drag a node to move it.";
      break;
    case "pickStart":
      infoBox.innerHTML = "Click a node to set it as start node.";
      break;
    case "pickEnd":
      infoBox.innerHTML = "Click a node to set it as end node.";
      break;
    default:
      infoBox.innerHTML = "Select start and end nodes, then run Dijkstra.";
  }
}

function runDijkstra() {
  if (!startNode || !endNode) {
    alert("Pick start and end nodes first!");
    return;
  }

  // Reset visual states
  clearPathHighlights();

  distances = {};
  previous = {};
  visited = {};
  pq = [];
  shortestPath = [];

  nodes.forEach(n => {
    distances[n.id] = Infinity;
    previous[n.id] = null;
    visited[n.id] = false;
  });

  distances[startNode.id] = 0;
  pq.push(startNode);

  dijkstraRunning = true;
  pathReconstructed = false;
  pathAnimation = false;
  document.getElementById("info-box").innerHTML = "Running Dijkstra...";
}

function runDijkstraStep() {
  if (pq.length === 0) {
    dijkstraRunning = false;
    showResult();
    return;
  }

  pq.sort((a, b) => distances[a.id] - distances[b.id]);
  let u = pq.shift();

  if (visited[u.id]) return;
  visited[u.id] = true;

  edges.forEach(e => {
    let v = e.a === u ? e.b : e.b === u ? e.a : null;
    if (v && !visited[v.id]) {
      let alt = distances[u.id] + e.weight;
      if (alt < distances[v.id]) {
        distances[v.id] = alt;
        previous[v.id] = u;
        pq.push(v);
      }
    }
  });

  if (u === endNode) {
    dijkstraRunning = false;
    showResult();
  }
}

function showResult() {
  let path = [];
  let u = endNode;
  while (u) {
    path.unshift(u);
    u = previous[u.id];
  }

  let distance = distances[endNode.id];
  let infoBox = document.getElementById("info-box");

  if (distance === Infinity) {
    infoBox.innerHTML = `No path found from ${startNode.label} → ${endNode.label}`;
  } else {
    shortestPath = path;
    highlightPath(path);
    let pathLabels = path.map(n => n.label).join(" → ");
    infoBox.innerHTML = `
      Shortest distance: ${distance}<br>
      Path: ${pathLabels}<br>
      <button onclick="startPathAnimation()" style="margin-top: 5px; padding: 5px 10px; background: #1e90ff; color: white; border: none; border-radius: 3px; cursor: pointer;">Animate Path</button>
    `;
    
    // Start path animation automatically
    setTimeout(() => startPathAnimation(), 1000);
  }
}

function highlightPath(path) {
  // Reset all highlights
  clearPathHighlights();
  
  // Highlight nodes in path
  path.forEach(node => {
    node.isInPath = true;
  });
  
  // Highlight edges in path
  for (let i = 0; i < path.length - 1; i++) {
    let nodeA = path[i];
    let nodeB = path[i + 1];
    
    edges.forEach(edge => {
      if ((edge.a === nodeA && edge.b === nodeB) || (edge.a === nodeB && edge.b === nodeA)) {
        edge.isInPath = true;
      }
    });
  }
}

function clearPathHighlights() {
  nodes.forEach(n => {
    n.isInPath = false;
    n.isCurrentlyAnimated = false;
  });
  edges.forEach(e => {
    e.isInPath = false;
  });
}

function startPathAnimation() {
  pathAnimation = true;
  currentPathIndex = 0;
  lastPathTime = millis();
  
  // Clear previous highlights
  nodes.forEach(n => n.isCurrentlyAnimated = false);
  
  document.getElementById("info-box").innerHTML += "<br><span style='color: #ff6600; font-weight: bold;'>Animating shortest path...</span>";
}

function animatePathStep() {
  if (currentPathIndex >= shortestPath.length) {
    pathAnimation = false;
    document.getElementById("info-box").innerHTML = document.getElementById("info-box").innerHTML.replace("<br><span style='color: #ff6600; font-weight: bold;'>Animating shortest path...</span>", "<br><span style='color: #00aa00; font-weight: bold;'>Animation complete!</span>");
    return;
  }
  
  // Clear previous animation state
  nodes.forEach(n => n.isCurrentlyAnimated = false);
  
  // Highlight current node
  shortestPath[currentPathIndex].isCurrentlyAnimated = true;
  
  currentPathIndex++;
  lastPathTime = millis();
}

function resetGraph() {
  nodes = [];
  edges = [];
  startNode = null;
  endNode = null;
  selectedNode = null;
  dijkstraRunning = false;
  pathAnimation = false;
  shortestPath = [];
  document.getElementById("info-box").innerHTML = "Graph reset. Select start and end nodes, then run Dijkstra.";
}

// Make startPathAnimation globally accessible
window.startPathAnimation = startPathAnimation;