
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
var theta = [0,0,0];
var theta2 = [0,0,0];
var theta3 = [0,0,0];
var theta4 = [0,0,0];
var Fish_head_pos = [Math.cos(theta[0])*2,0,0];
var Fish_tail_pos = [Math.cos(theta2[0])*2,0,-1];
var Fish_tail_top = [Math.cos(theta3[0])*2,0.1,-2];
var Fish_tail_bot = [Math.cos(theta4[0])*2,-0.1,-2];
var bubble_origin = [4, 2, 2];

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
    
	if( animFlag )
    {
		// dt is the change in time or delta time from the last frame to this one
		// in animation typically we have some property or degree of freedom we want to evolve over time
		// For example imagine x is the position of a thing.
		// To get the new position of a thing we do something called integration
		// the simpelst form of this looks like:
		// x_new = x + v*dt
		// That is the new position equals the current position + the rate of of change of that position (often a velocity or speed), times the change in time
		// We can do this with angles or positions, the whole x,y,z position or just one dimension. It is up to us!
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
		gTranslate(4, 2, 1);
		gScale(sphereScale[0], sphereScale[1], sphereScale[2]);
		gPush();
		{
			setColor(vec4(0.8, 0, 0.8, 1.0));
			drawSphere();
		}
		gPop();
	gPop();
	// Human model body
	gPush();
		gTranslate(4,0.75,0);
		gScale(0.5, 1, 1);
		gRotate(-15,0,1,0);
		gPush();
		{
			setColor(vec4(0.8,0.0,0.8,1));
			drawCube();
		}
		gPop();
	gPop();
	
	//Human right leg joint 1
	gPush();
		gTranslate(3.75,-0.5,0);
		gScale(0.1, 0.5, 0.1);
		gRotate(-30,0,1,0);
		gPush();
		{
			setColor(vec4(0.8,0.0,0.8,1));
			drawCube();
		}
		gPop();
	gPop();
	//Human right leg joint 2
	gPush();
		gTranslate(3.75,-1.5,0);
		gScale(0.1, 0.5, 0.1);
		gRotate(-30,0,1,0);
		gPush();
		{
			setColor(vec4(0.8,0.0,0.8,1));
			drawCube();
		}
		gPop();
	gPop();
	//Human right foot
	gPush();
		gTranslate(3.75,-2,0);
		gScale(0.15, 0.10, 0.20);
		gRotate(-30,0,1,0);
		
		gPush();
		{
			setColor(vec4(0.8,0.0,0.8,1));
			drawCube();
		}
		gPop();
	gPop();
	//Human left leg joint 1
	gPush();
		gTranslate(4.25,-0.5,0);
		gScale(0.1, 0.5, 0.1);
		gRotate(-30,0,1,0);
		gPush();
		{
			setColor(vec4(0.8,0.0,0.8,1));
			drawCube();
		}
		gPop();
	gPop();
	//Human left leg joint 2
	gPush();
		gTranslate(4.25,-1.5,0);
		gScale(0.1, 0.5, 0.1);
		gRotate(-30,0,1,0);
		gPush();
		{
			setColor(vec4(0.8,0.0,0.8,1));
			drawCube();
		}
		gPop();
	gPop();
	//Human left foot
	gPush();
		gTranslate(4.25,-2,0);
		gScale(0.15, 0.10, 0.20);
		gRotate(-30,0,1,0);
		
		gPush();
		{
			setColor(vec4(0.8,0.0,0.8,1));
			drawCube();
		}
		gPop();
	gPop();
	
	// Cube example
	//gPush();
		//gTranslate(cubePosition[0],cubePosition[1],cubePosition[2]);
		//gPush();
		//{
			//setColor(vec4(0.0,1.0,0.0,1.0));
			// Here is an example of integration to rotate the cube around the y axis at 30 degrees per second
			// new cube rotation around y = current cube rotation around y + 30deg/s*dt
		//	cubeRotation[1] = cubeRotation[1] + 30*dt;
			// This calls a simple helper function to apply the rotation (theta, x, y, z), 
			// where x,y,z define the axis of rotation. Here is is the y axis, (0,1,0).
			//gRotate(cubeRotation[1],0,1,0);
			//drawCube();
		//}
		//gPop();
	//gPop();
    
	// Cylinder example
	//gPush();
		//gTranslate(cylinderPosition[0],cylinderPosition[1],cylinderPosition[2]);
		//gPush();
		//{
			//setColor(vec4(-4.0,0.0,4.0,1.0));
			//cylinderRotation[1] = cylinderRotation[1] + 60*dt;
			//gRotate(cylinderRotation[1],0,1,0);
			//drawCylinder();
		//}
		//gPop();
	//gPop();	
	
	
	
	
    //Fish front
	gPush();
		gTranslate(Fish_head_pos[0],Fish_head_pos[1], Fish_head_pos[2]);
		gScale(0.5,0.5,0.5);
		gRotate(Math.tan(theta[0])*100,0,1,0);
		gPush();
		{
			setColor(vec4(0.5,0.5,0.5,1));
			if(animFlag){
				theta[0] += 0.05;
				theta[1] += 0.01
				theta[2] += 0.05;
				Fish_head_pos[0] = Math.cos(theta[0])*2;
				Fish_head_pos[1] = Math.sin(theta[1])*2;
				Fish_head_pos[2] = Math.sin(theta[2])*2;
				gRotate(Math.cos(theta[0]),1,0,0,);
			}
			drawCone();
		}
		gPop();
	gPop();
	
	
	//fish back
	gPush();
		gTranslate(Fish_tail_pos[0],Fish_tail_pos[1], Fish_tail_pos[2]);
		gRotate(180, 0,1,0);
		gScale(0.5,0.5,1.75);
		gRotate(Math.sin(theta[0])*100,0,1,0);
		gPush();
		{
			setColor(vec4(0.5,0,0,1));
			if(animFlag){
				theta2[0] += 0.05;
				theta2[1] += 0.05;
				theta2[2] += 0.05;
				Fish_tail_pos[0] = Math.cos(theta2[0])*2-4;
				Fish_tail_pos[1] = Math.sin(theta2[1])*2-4;
				Fish_tail_pos[2] = Math.sin(theta2[2])*2-4;
				
			}
			drawCone();
		}
		gPop();
	gPop();
	
	
	//fish tail (cones aswell)
	gPush();
		gTranslate(Fish_tail_top[0],Fish_tail_top[1],Fish_tail_top[2]);
		gRotate(180, 0,1,0);
		gRotate(-25,1,0,0);
		gScale(0.1,0.1,0.5);
		gRotate(Math.cos(theta3[0])*100,0,0,1);
		gPush();
		{
			setColor(vec4(0.5,0,0,1));
			if(animFlag){
				theta3[0] += 0.05;
				theta3[1] += 0.01;
				theta3[2] += 0.05;
				Fish_tail_top[0] = Math.cos(theta3[0])*2;
				Fish_tail_pos[1] = Math.sin(theta3[1])*2;
				Fish_tail_top[2] = Math.sin(theta3[2])*2;
			}
			drawCone();
		}
		gPop();
	gPop();
	gPush();
		gTranslate(Fish_tail_bot[0],Fish_tail_bot[1],Fish_tail_bot[2]);
		gRotate(180, 0,1,0);
		gRotate(25,1,0,0);
		gScale(0.1,0.1,0.5);
		gRotate(Math.cos(theta4[0])*100,0,0,1);
		gPush();
		{
			setColor(vec4(0.5,0,0,1));
			if(animFlag){
				theta4[0] += 0.05;
				theta4[1] += 0.02;
				theta4[2] += 0.05;
				Fish_tail_bot[0] = Math.cos(theta4[0])*2;
				Fish_tail_pos[1] = Math.sin(theta4[1])*2;
				Fish_tail_bot[2] = Math.sin(theta4[2])*2;
			}
			drawCone();
		}
		gPop();
	gPop();
	//fish eye right
	gPush();
		gTranslate(2.25,0.2,1);
		gScale(0.1,0.1,0.1);
		gPush();
		{
			setColor(vec4(1, 1, 1, 1.0));
			drawSphere();	
		}
		gPop();
	gPop();
	//fish pupil right
	gPush();
		gTranslate(2.25,0.2,1.1);
		gScale(0.05,0.05,0.05);
		gPush();
		{
			setColor(vec4(0, 0, 0, 1.0));
			drawSphere();	
		}
		gPop();
	gPop();
	//fish eye left
	gPush();
		gTranslate(1.75,0.2,1);
		gScale(0.1,0.1,0.1);
		gPush();
		{
			setColor(vec4(1, 1, 1, 1.0));
			drawSphere();	
		}
		gPop();
	gPop();
	//fish pupil left
	gPush();
		gTranslate(1.75,0.2,1.1);
		gScale(0.05,0.05,0.05);
		gPush();
		{
			setColor(vec4(0, 0, 0, 1.0));
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
				gScale(0.1,0.3,0.1);
				gPush();
				{
					setColor(vec4(0, 0.5, 0, 1.0));
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
			gScale(0.1,0.3,0.1);
			gPush();
			{
				setColor(vec4(0, 0.5, 0, 1.0));
				drawSphere();	
			}
			gPop();
		gPop();
	}
	//bubbles
	if(animFlag){
		bubbles();
	}
	// Cone example
	//gPush();
		//gTranslate(conePosition[0],conePosition[1],conePosition[2]);
		//gPush();
		//{
		//	setColor(vec4(1.0,1.0,0.0,1.0));
		//	coneRotation[1] = coneRotation[1] + 90*dt;
		//	gRotate(coneRotation[1],0,1,0);
		//	drawCone();
		//}
		//gPop();
	//gPop();
    
    if( animFlag )
        window.requestAnimFrame(render);
}
function bubbles(){
	gPush();
		gTranslate(bubble_origin[0], bubble_origin[1], bubble_origin[2]);
		gScale(0.1,0.1,0.1);
		gPush();
		{
			setColor(vec4(1, 1, 1, 1.0));
			bubble_origin[1] = bubble_origin[1] + 0.5*dt;
			gTranslate(bubble_origin[1],0, 1,0);
			if(bubble_origin[1] > 6.2){
				bubble_origin[1] = 2;
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
