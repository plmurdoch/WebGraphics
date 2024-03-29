
var canvas;
var gl;

var program;

var near = 1;
var far = 100;


var left = -6.0;
var right = 6.0;
var ytop =6.0;
var bottom = -6.0;


var lightPosition2 = vec4(100.0, 100.0, 100.0, 1.0 );
var lightPosition = vec4(0.0, 0.0, 100.0, 1.0 );

var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialSpecular = vec4( 0.4, 0.4, 0.4, 1.0 );
var materialShininess = 30.0;

var ambientColor, diffuseColor, specularColor;

var modelMatrix, viewMatrix, modelViewMatrix, projectionMatrix, normalMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc;
var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var RX = 0;
var RY = 0;
var RZ = 0;

var MS = []; // The modeling matrix stack
var TIME = 0.0; // Realtime
var dt = 0.0
var prevTime = 0.0;
var resetTimerFlag = true;
var animFlag = false;
var controller;

// These are used to store the current state of objects.
// In animation it is often useful to think of an object as having some DOF
// Then the animation is simply evolving those DOF over time.
var sphereRotation = [0,0,0];
var spherePosition = [0,-3.25,0];

var sphereScale = [0.25, 0.25, 0.25];

var cubeRotation = [1,1,0];
var cubePosition = [-1,4,0];

var cylinderRotation = [0,0,0];
var cylinderPosition = [-4,4,0];

var coneRotation = [0,1,0];
var conePosition = [3,4,0];

//Custom global variables
var spherePosition2 =[-1, -3.75, 0];
var human_head = [4,2,1];
var human_body = [4 ,0.75,0];
var human_hip =[3.75,-0.5,0];
var human_leg = [3.75,-1.5,0];
var human_foot = [3.75,,0.5];
var Fish_head_pos = [2,0,0];
var Fish_head_x_rad = 2;
var bubble_origin = [4, 2, 2];
var rerender = false;
// Setting the colour which is needed during illumination of a surface
function setColor(c)
{
    ambientProduct = mult(lightAmbient, c);
    diffuseProduct = mult(lightDiffuse, c);
    specularProduct = mult(lightSpecular, materialSpecular);
    
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "specularProduct"),flatten(specularProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, 
                                        "shininess"),materialShininess );
}

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.5, 0.5, 1.0, 1.0 );
    
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    

    setColor(materialDiffuse);
	
	// Initialize some shapes, note that the curved ones are procedural which allows you to parameterize how nice they look
	// Those number will correspond to how many sides are used to "estimate" a curved surface. More = smoother
    Cube.init(program);
    Cylinder.init(20,program);
    Cone.init(20,program);
    Sphere.init(36,program);

    // Matrix uniforms
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    
    // Lighting Uniforms
    gl.uniform4fv( gl.getUniformLocation(program, 
       "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "specularProduct"),flatten(specularProduct) );	
    gl.uniform4fv( gl.getUniformLocation(program, 
       "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, 
       "shininess"),materialShininess );


    document.getElementById("animToggleButton").onclick = function() {
        if( animFlag ) {
            animFlag = false;
        }
        else {
            animFlag = true;
            resetTimerFlag = true;
            window.requestAnimFrame(render);
        }
        //console.log(animFlag);
		
		controller = new CameraController(canvas);
		controller.onchange = function(xRot,yRot) {
			RX = xRot;
			RY = yRot;
			window.requestAnimFrame(render); };
    };

    render(0);
}

// Sets the modelview and normal matrix in the shaders
function setMV() {
    modelViewMatrix = mult(viewMatrix,modelMatrix);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    normalMatrix = inverseTranspose(modelViewMatrix);
    gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(normalMatrix) );
}

// Sets the projection, modelview and normal matrix in the shaders
function setAllMatrices() {
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );
    setMV();   
}

// Draws a 2x2x2 cube center at the origin
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCube() {
    setMV();
    Cube.draw();
}

// Draws a sphere centered at the origin of radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawSphere() {
    setMV();
    Sphere.draw();
}

// Draws a cylinder along z of height 1 centered at the origin
// and radius 0.5.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCylinder() {
    setMV();
    Cylinder.draw();
}

// Draws a cone along z of height 1 centered at the origin
// and base radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCone() {
    setMV();
    Cone.draw();
}

// Post multiples the modelview matrix with a translation matrix
// and replaces the modeling matrix with the result
function gTranslate(x,y,z) {
    modelMatrix = mult(modelMatrix,translate([x,y,z]));
}

// Post multiples the modelview matrix with a rotation matrix
// and replaces the modeling matrix with the result
function gRotate(theta,x,y,z) {
    modelMatrix = mult(modelMatrix,rotate(theta,[x,y,z]));
}

// Post multiples the modelview matrix with a scaling matrix
// and replaces the modeling matrix with the result
function gScale(sx,sy,sz) {
    modelMatrix = mult(modelMatrix,scale(sx,sy,sz));
}

// Pops MS and stores the result as the current modelMatrix
function gPop() {
    modelMatrix = MS.pop();
}

// pushes the current modelViewMatrix in the stack MS
function gPush() {
    MS.push(modelMatrix);
}


function render(timestamp) {
    
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    eye = vec3(0,0,10);
    MS = []; // Initialize modeling matrix stack
	
	// initialize the modeling matrix to identity
    modelMatrix = mat4();
    
    // set the camera matrix
    viewMatrix = lookAt(eye, at , up);
   
    // set the projection matrix
    projectionMatrix = ortho(left, right, bottom, ytop, near, far);
    
    
    // set all the matrices
    setAllMatrices();
    
		// dt is the change in time or delta time from the last frame to this one
		// in animation typically we have some property or degree of freedom we want to evolve over time
		// For example imagine x is the position of a thing.
		// To get the new position of a thing we do something called integration
		// the simpelst form of this looks like:
		// x_new = x + v*dt
		// That is the new position equals the current position + the rate of of change of that position (often a velocity or speed), times the change in time
		// We can do this with angles or positions, the whole x,y,z position or just one dimension. It is up to us!
	if(animFlag){
		dt = (timestamp - prevTime) / 1000.0;
		prevTime = timestamp;
	}
	//Ground Box
	gPush();
		gTranslate(0,-5,0);
		gScale(6,1,1);
		gPush();
		{
			setColor(vec4(0.0, 0.0, 0.0, 1.0))
			drawCube();
			
		}
		gPop();
	gPop();
	
	
	// First Rock/sphere
	gPush();
		// Put the sphere where it should be!
		gTranslate(spherePosition[0],spherePosition[1],spherePosition[2]);
		gScale(0.75, 0.75, 0.75);
		gPush();
		{
			// Draw the sphere!
			setColor(vec4(0.5,0.5,0.5,1.0));
			drawSphere();
		}
		gPop();
	gPop();
	// Second Rock/Sphere
	gPush();
		gTranslate(spherePosition2[0], spherePosition2[1], spherePosition2[2]);
		gScale(sphereScale[0], sphereScale[1], sphereScale[2]);
		gPush();
		{
			setColor(vec4(0.5, 0.5, 0.5, 1.0));
			drawSphere();	
		}
		gPop();
	gPop();
	//Human model head
	gPush();
		gTranslate(human_head[0], human_head[1], human_head[2]);
		gScale(sphereScale[0], sphereScale[1], sphereScale[2]);
		gPush();
		{
			setColor(vec4(0.8, 0, 0.8, 1.0));
			if(animFlag){
				human_head[0] = 4+(Math.cos(timestamp/1000))/2;
				human_head[1]= 2+(Math.sin(timestamp/500))/2;
			}
			drawSphere();
		}
		gPop();
	gPop();
	// Human model body
	gPush();
		gTranslate(human_body[0],human_body[1],human_body[2]);
		gScale(0.5, 1, 1);
		gRotate(-15,0,1,0);
		gPush();
		{
			setColor(vec4(0.8,0.0,0.8,1));
			if(animFlag){
				human_body[0] = 4+(Math.cos(timestamp/1000))/2;
				human_body[1]= 0.75+(Math.sin(timestamp/500))/2;
			}
			drawCube();
		}
		gPop();
	gPop();
	
	//Human right leg joint 1
	gPush();
		gTranslate(human_body[0],human_body[1],human_body[2]);
		gPush();
		{
			setColor(vec4(0.8,0.0,0.8,1));
			gTranslate(-0.25, -1.25, 0);
			gScale(0.1, 0.5, 0.1);
			gRotate(-30,0,1,0);
			drawCube();
		}
		gPop();
		//Human right leg joint 2
		gPush();
		{
			setColor(vec4(0.8,0.0,0.8,1));
			gTranslate(-0.25, -2.25, 0);
			gScale(0.1, 0.5, 0.1);
			gRotate(-30,0,1,0);
			drawCube();
		}
		gPop();
		//Human foot
		gPush();
		{
			setColor(vec4(0.8,0.0,0.8,1));
			gTranslate(-0.25, -2.75, 0.3);
			gScale(0.12, 0.05, 0.3);
			gRotate(-30,0,1,0);
			drawCube();
		}
		gPop();
		//Human left leg joint 1
		gPush();
		{
			setColor(vec4(0.8,0.0,0.8,1));
			gTranslate(0.25, -1.25, 0);
			gScale(0.1, 0.5, 0.1);
			gRotate(-30,0,1,0);
			drawCube();
		}
		gPop();
		//human left leg joint 2
		gPush();
		{
			setColor(vec4(0.8,0.0,0.8,1));
			gTranslate(0.25, -2.25, 0);
			gScale(0.1, 0.5, 0.1);
			gRotate(-30,0,1,0);
			drawCube();
		}
		gPop();
		//human left foot
		gPush();
		{
			setColor(vec4(0.8,0.0,0.8,1));
			gTranslate(0.25, -2.75, 0.3);
			gScale(0.12, 0.05, 0.3);
			gRotate(-30,0,1,0);
			drawCube();
		}
		gPop();
	gPop();
	
	
    //Fish head
	gPush();
		gTranslate(Fish_head_pos[0],Fish_head_pos[1], Fish_head_pos[2]);
		gPush();
		{
			setColor(vec4(0.5,0.5,0.5,1));
			if(animFlag){
				cylinderRotation[3] =((Math.sin(dt/1000)^2)+(Math.cos(dt/1000)^2))/8.8;
				cylinderRotation[2] = cylinderRotation[2] - cylinderRotation[3];
			}
			gRotate(cylinderRotation[2],0,1,0);
			gScale(0.5,0.5,0.5);
			if(animFlag){
				Fish_head_pos[0] = Math.cos(timestamp/1000)*Fish_head_x_rad;
				Fish_head_pos[1] = Math.sin(timestamp/2000)*2.1;
				Fish_head_pos[2] = Math.sin(timestamp/1000);
			}
			drawCone();
		}
		gPop();
	gPop();
	//Fish Rest
	gPush();
		gTranslate(Fish_head_pos[0], Fish_head_pos[1], Fish_head_pos[2]);
		gRotate(cylinderRotation[2],0,1,0);
		//Fish Body
		gPush();
		{
			setColor(vec4(0.5,0,0,1));
			gTranslate(0,0, -1);
			gRotate(180, 0, 1, 0);
			gScale(0.5,0.5, 1.5);
			drawCone();
		}
		gPop();
		//Fish tail Upper
		gPush();
		{
			setColor(vec4(0.5,0,0,1));
			gTranslate(0,0.3, -2.2);
			gRotate(180, 0,1,0);
			gRotate(-25,1,0,0);
			gScale(0.1,0.1,1);
			drawCone();
		}
		gPop();
		//Fish tail lower
		gPush();
		{
			setColor(vec4(0.5,0,0,1));
			gTranslate(0,-0.1, -2);
			gRotate(180, 0,1,0);
			gRotate(25,1,0,0);
			gScale(0.1,0.1,0.5);
			drawCone();
		}
		gPop();
		//Fish eye right
		gPush();
		{
			setColor(vec4(1, 1, 1, 1.0));
			gTranslate(-0.25, 0.2,0);
			gScale(0.1,0.1,0.1);
			drawSphere();	
		}
		gPop();
		//Fish pupil right
		gPush();
		{
			setColor(vec4(0, 0, 0, 1.0));
			gTranslate(-0.25, 0.2, 0.1);
			gScale(0.05,0.05,0.05);
			drawSphere();	
		}
		gPop();
		//Fish eye left 
		gPush();
		{
			setColor(vec4(1, 1, 1, 1.0));
			gTranslate(0.25, 0.2, 0);
			gScale(0.1,0.1,0.1);
			drawSphere();	
		}
		gPop();
		//Fish pupil left
		gPush();
		{
			setColor(vec4(0, 0, 0, 1.0));
			gTranslate(0.25,0.2, 0.1);
			gScale(0.05,0.05,0.05);
			drawSphere();	
		}
		gPop();
	gPop();
	//seaweed
	for(var k = 0; k < 2; k++){
		l = -0.75+ (k*1.50);
		for(var i = 0; i <10; i++){
			gPush();
			j = -2.75 + (i*0.6);
				gTranslate(l,j,0);
				gPush();
				{
					setColor(vec4(0, 0.5, 0, 1.0));
					if(animFlag){
						gTranslate((Math.cos(timestamp/1000))/8, 0,0);
					}
					gScale(0.1,0.3,0.1);
					drawSphere();	
				}
				gPop();
			gPop();
		}
	}
	for(var i = 0; i <10; i++){
		gPush();
		j = -2.25 + (i*0.6);
			gTranslate(0,j,0);
			gPush();
			{
				setColor(vec4(0, 0.5, 0, 1.0));
				if(animFlag){
					gTranslate((Math.cos(timestamp/1000))/8, 0,0);
				}
				gScale(0.1,0.3,0.1);
				drawSphere();	
			}
			gPop();
		gPop();
	}
	//bubbles
	if(animFlag){
		for(var i = 0; i < 10; i++){
			
			bubbles();
		}
	}
    window.requestAnimFrame(render);
}
function bubbles(){
	gPush();

		gTranslate(human_head[0], bubble_origin[1], bubble_origin[2]);
		gScale(0.1,0.1,0.1);
		gPush();
		{
			setColor(vec4(1, 1, 1, 1.0));
			bubble_origin[1] = bubble_origin[1] + 0.5*dt;
			gTranslate(bubble_origin[1],0, 1,0);
			if(bubble_origin[1] > 6.2){
				bubble_origin[1] = human_head[1];
			}
			drawSphere();	
		}
		gPop();
	gPop();
	
}
// A simple camera controller which uses an HTML element as the event
// source for constructing a view matrix. Assign an "onchange"
// function to the controller as follows to receive the updated X and
// Y angles for the camera:
//
//   var controller = new CameraController(canvas);
//   controller.onchange = function(xRot, yRot) { ... };
//
// The view matrix is computed elsewhere.
function CameraController(element) {
	var controller = this;
	this.onchange = null;
	this.xRot = 0;
	this.yRot = 0;
	this.scaleFactor = 3.0;
	this.dragging = false;
	this.curX = 0;
	this.curY = 0;
	
	// Assign a mouse down handler to the HTML element.
	element.onmousedown = function(ev) {
		controller.dragging = true;
		controller.curX = ev.clientX;
		controller.curY = ev.clientY;
	};
	
	// Assign a mouse up handler to the HTML element.
	element.onmouseup = function(ev) {
		controller.dragging = false;
	};
	
	// Assign a mouse move handler to the HTML element.
	element.onmousemove = function(ev) {
		if (controller.dragging) {
			// Determine how far we have moved since the last mouse move
			// event.
			var curX = ev.clientX;
			var curY = ev.clientY;
			var deltaX = (controller.curX - curX) / controller.scaleFactor;
			var deltaY = (controller.curY - curY) / controller.scaleFactor;
			controller.curX = curX;
			controller.curY = curY;
			// Update the X and Y rotation angles based on the mouse motion.
			controller.yRot = (controller.yRot + deltaX) % 360;
			controller.xRot = (controller.xRot + deltaY);
			// Clamp the X rotation to prevent the camera from going upside
			// down.
			if (controller.xRot < -90) {
				controller.xRot = -90;
			} else if (controller.xRot > 90) {
				controller.xRot = 90;
			}
			// Send the onchange event to any listener.
			if (controller.onchange != null) {
				controller.onchange(controller.xRot, controller.yRot);
			}
		}
	};
}
