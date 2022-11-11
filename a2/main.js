
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
var bezierRotation = [0,0,0];
var arm_angle1 = -45;
var arm_angle2 = 135;
var arm_angle3 = 0;
var arm_angle4 = 90;
var bag_angle = 0;
var rebound = 0;
var reverse = 0;
var side_1 = 0.0253125;
var side_2 = -0.0253125;
var twist_angle = -22.5;
var twist_sig = 0;
var useTextures = 1;

//making a texture image procedurally
//Let's start with a 1-D array
var texSize = 64;
var imageCheckerBoardData = new Array();

// Now for each entry of the array make another array
// 2D array now!
for (var i =0; i<texSize; i++)
	imageCheckerBoardData[i] = new Array();

// Now for each entry in the 2D array make a 4 element array (RGBA! for colour)
for (var i =0; i<texSize; i++)
	for ( var j = 0; j < texSize; j++)
		imageCheckerBoardData[i][j] = new Float32Array(4);

// Now for each entry in the 2D array let's set the colour.
// We could have just as easily done this in the previous loop actually
for (var i =0; i<texSize; i++) 
	for (var j=0; j<texSize; j++) {
		var c = (i + j ) % 2;
		imageCheckerBoardData[i][j] = [c, c, c, 1];
}

//Convert the image to uint8 rather than float.
var imageCheckerboard = new Uint8Array(4*texSize*texSize);

for (var i = 0; i < texSize; i++)
	for (var j = 0; j < texSize; j++)
	   for(var k =0; k<4; k++)
			imageCheckerboard[4*texSize*i+4*j+k] = 255*imageCheckerBoardData[i][j][k];
		
// For this example we are going to store a few different textures here
var textureArray = [] ;

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

// We are going to asynchronously load actual image files this will check if that call if an async call is complete
// You can use this for debugging
function isLoaded(im) {
    if (im.complete) {
        console.log("loaded") ;
        return true ;
    }
    else {
        console.log("still not loaded!!!!") ;
        return false ;
    }
}

// Helper function to load an actual file as a texture
// NOTE: The image is going to be loaded asyncronously (lazy) which could be
// after the program continues to the next functions. OUCH!
function loadFileTexture(tex, filename)
{
	//create and initalize a webgl texture object.
    tex.textureWebGL  = gl.createTexture();
    tex.image = new Image();
    tex.image.src = filename ;
    tex.isTextureReady = false ;
    tex.image.onload = function() { handleTextureLoaded(tex); }
}

// Once the above image file loaded with loadFileTexture is actually loaded,
// this funcion is the onload handler and will be called.
function handleTextureLoaded(textureObj) {
	//Binds a texture to a target. Target is then used in future calls.
		//Targets:
			// TEXTURE_2D           - A two-dimensional texture.
			// TEXTURE_CUBE_MAP     - A cube-mapped texture.
			// TEXTURE_3D           - A three-dimensional texture.
			// TEXTURE_2D_ARRAY     - A two-dimensional array texture.
    gl.bindTexture(gl.TEXTURE_2D, textureObj.textureWebGL);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // otherwise the image would be flipped upsdide down
	
	//texImage2D(Target, internalformat, width, height, border, format, type, ImageData source)
    //Internal Format: What type of format is the data in? We are using a vec4 with format [r,g,b,a].
        //Other formats: RGB, LUMINANCE_ALPHA, LUMINANCE, ALPHA
    //Border: Width of image border. Adds padding.
    //Format: Similar to Internal format. But this responds to the texel data, or what kind of data the shader gets.
    //Type: Data type of the texel data
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureObj.image);
	
	//Set texture parameters.
    //texParameteri(GLenum target, GLenum pname, GLint param);
    //pname: Texture parameter to set.
        // TEXTURE_MAG_FILTER : Texture Magnification Filter. What happens when you zoom into the texture
        // TEXTURE_MIN_FILTER : Texture minification filter. What happens when you zoom out of the texture
    //param: What to set it to.
        //For the Mag Filter: gl.LINEAR (default value), gl.NEAREST
        //For the Min Filter: 
            //gl.LINEAR, gl.NEAREST, gl.NEAREST_MIPMAP_NEAREST, gl.LINEAR_MIPMAP_NEAREST, gl.NEAREST_MIPMAP_LINEAR (default value), gl.LINEAR_MIPMAP_LINEAR.
    //Full list at: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texParameter
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
	
	//Generates a set of mipmaps for the texture object.
        /*
            Mipmaps are used to create distance with objects. 
        A higher-resolution mipmap is used for objects that are closer, 
        and a lower-resolution mipmap is used for objects that are farther away. 
        It starts with the resolution of the texture image and halves the resolution 
        until a 1x1 dimension texture image is created.
        */
    gl.generateMipmap(gl.TEXTURE_2D);
	
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); //Prevents s-coordinate wrapping (repeating)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); //Prevents t-coordinate wrapping (repeating)
    gl.bindTexture(gl.TEXTURE_2D, null);
    console.log(textureObj.image.src) ;
    
    textureObj.isTextureReady = true ;
}

// Takes an array of textures and calls render if the textures are created/loaded
// This is useful if you have a bunch of textures, to ensure that those files are
// actually laoded from disk you can wait and delay the render function call
// Notice how we call this at the end of init instead of just calling requestAnimFrame like before
function waitForTextures(texs) {
    setTimeout(
		function() {
			   var n = 0 ;
               for ( var i = 0 ; i < texs.length ; i++ )
               {
                    console.log(texs[i].image.src) ;
                    n = n+texs[i].isTextureReady ;
               }
               wtime = (new Date()).getTime() ;
               if( n != texs.length )
               {
               		console.log(wtime + " not ready yet") ;
               		waitForTextures(texs) ;
               }
               else
               {
               		console.log("ready to render") ;
					render(0);
               }
		},
	5) ;
}

// This will use an array of existing image data to load and set parameters for a texture
// We'll use this function for procedural textures, since there is no async loading to deal with
function loadImageTexture(tex, image) {
	//create and initalize a webgl texture object.
    tex.textureWebGL  = gl.createTexture();
    tex.image = new Image();

	//Binds a texture to a target. Target is then used in future calls.
		//Targets:
			// TEXTURE_2D           - A two-dimensional texture.
			// TEXTURE_CUBE_MAP     - A cube-mapped texture.
			// TEXTURE_3D           - A three-dimensional texture.
			// TEXTURE_2D_ARRAY     - A two-dimensional array texture.
    gl.bindTexture(gl.TEXTURE_2D, tex.textureWebGL);

	//texImage2D(Target, internalformat, width, height, border, format, type, ImageData source)
    //Internal Format: What type of format is the data in? We are using a vec4 with format [r,g,b,a].
        //Other formats: RGB, LUMINANCE_ALPHA, LUMINANCE, ALPHA
    //Border: Width of image border. Adds padding.
    //Format: Similar to Internal format. But this responds to the texel data, or what kind of data the shader gets.
    //Type: Data type of the texel data
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
	
	//Generates a set of mipmaps for the texture object.
        /*
            Mipmaps are used to create distance with objects. 
        A higher-resolution mipmap is used for objects that are closer, 
        and a lower-resolution mipmap is used for objects that are farther away. 
        It starts with the resolution of the texture image and halves the resolution 
        until a 1x1 dimension texture image is created.
        */
    gl.generateMipmap(gl.TEXTURE_2D);
	
	//Set texture parameters.
    //texParameteri(GLenum target, GLenum pname, GLint param);
    //pname: Texture parameter to set.
        // TEXTURE_MAG_FILTER : Texture Magnification Filter. What happens when you zoom into the texture
        // TEXTURE_MIN_FILTER : Texture minification filter. What happens when you zoom out of the texture
    //param: What to set it to.
        //For the Mag Filter: gl.LINEAR (default value), gl.NEAREST
        //For the Min Filter: 
            //gl.LINEAR, gl.NEAREST, gl.NEAREST_MIPMAP_NEAREST, gl.LINEAR_MIPMAP_NEAREST, gl.NEAREST_MIPMAP_LINEAR (default value), gl.LINEAR_MIPMAP_LINEAR.
    //Full list at: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texParameter
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); //Prevents s-coordinate wrapping (repeating)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); //Prevents t-coordinate wrapping (repeating)
    gl.bindTexture(gl.TEXTURE_2D, null);

    tex.isTextureReady = true;
}

// This just calls the appropriate texture loads for this example adn puts the textures in an array
function initTexturesForExample() {
    textureArray.push({}) ;
    loadFileTexture(textureArray[textureArray.length-1],"sunset.bmp") ;
    
    textureArray.push({}) ;
    loadImageTexture(textureArray[textureArray.length-1],imageCheckerboard) ;
}

// Changes which texture is active in the array of texture examples (see initTexturesForExample)
function toggleTextures() {
    useTextures = (useTextures + 1) % 2
	gl.uniform1i(gl.getUniformLocation(program, "useTextures"), useTextures);
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
	
	// We're going to initialize a new shape that will sort of look like a terrain for fun
	p1 = [[vec3(-3,-3,0), vec3(-1,-3,0), vec3(1,-3,0), vec3(3,-3,0)],
		 [vec3(-3,-1,0), vec3(-1,-1,3), vec3(1,-1,3), vec3(3,-1,0)],
		 [vec3(-3,1,0), vec3(-1,1,3), vec3(1,1,3), vec3(3,1,0)],
		 [vec3(-3,3,0), vec3(-1,3,0), vec3(1,3,0), vec3(3,3,0)]] ;
	gBezierPatch1 = new BezierPatch3(2.0,p1,program) ;

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
            animFlag = true  ;
            resetTimerFlag = true ;
            window.requestAnimFrame(render);
        }
    };
    
    document.getElementById("textureToggleButton").onclick = function() {
        toggleTextures() ;
        window.requestAnimFrame(render);
    };

    var controller = new CameraController(canvas);
    controller.onchange = function(xRot,yRot) {
        RX = xRot ;
        RY = yRot ;
        window.requestAnimFrame(render); };
	
	
	// Helper function just for this example to load the set of textures
    initTexturesForExample() ;

    waitForTextures(textureArray);
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

// Draw a Bezier patch
function drawB3(b) {
	setMV() ;
	b.draw() ;
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
    
    eye = vec3(0,-10,10);
    MS = []; // Initialize modeling matrix stack
	
	// initialize the modeling matrix to identity
    modelMatrix = mat4();
    
    // set the camera matrix
    viewMatrix = lookAt(eye, at, up);
   
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
	
	// We need to bind our textures, ensure the right one is active before we draw
	//Activate a specified "texture unit".
    //Texture units are of form gl.TEXTUREi | where i is an integer.
	gl.activeTexture(gl.TEXTURE0);
	if (useTextures % 2 == 1) 
	{
		//Binds a texture to a target. Target is then used in future calls.
		//Targets:
			// TEXTURE_2D           - A two-dimensional texture.
			// TEXTURE_CUBE_MAP     - A cube-mapped texture.
			// TEXTURE_3D           - A three-dimensional texture.
			// TEXTURE_2D_ARRAY     - A two-dimensional array texture.
		gl.bindTexture(gl.TEXTURE_2D, textureArray[0].textureWebGL);
		gl.uniform1i(gl.getUniformLocation(program, "texture1"), 0);
	}
    else
	{
		gl.bindTexture(gl.TEXTURE_2D, textureArray[1].textureWebGL);
		gl.uniform1i(gl.getUniformLocation(program, "texture2"), 0);
	}
	
	// Now let's draw a shape animated!
	// You may be wondering where the texture coordinates are!
	// We've modified the object.js to add in support for this attribute array!
	gPush();
	{
		bezierRotation[2] = bezierRotation[2] + 30*dt;
		//gRotate(bezierRotation[2], 0,0,1);
		gPush();
		{	
			gTranslate(-2, 0, 2);
			gRotate(270,0,0,1);
			gPush();
			{
				gRotate(twist_angle, 0,0,1);
				gPush();
				{
					gScale(0.6,0.3,1.5);
					drawCube();
				}
				gPop();
				gRotate(-twist_angle,0,0,1);
				gPush();
				{
					gTranslate(0,0,2);
					gScale(0.5, 0.5, 0.5);
					drawSphere();
				}
				gPop();
				arm_joints(dt);
				leg_joints(dt);
			}
			gPop();
		}
		gPop();
		gPush();
		{	
			gPush();
			{
				Punching_bag();
			}
			gPop();
		}
		gPop();
	}
	gPop();
	if(animFlag){
		if(reverse == 0){
			arm_angle1 = arm_angle1+1.5;
			arm_angle2 = arm_angle2-1.5;
			arm_angle3 = arm_angle3+1.5;
			arm_angle4 = arm_angle4-1.5;
			if(arm_angle1 == 90&&arm_angle2 == 0){
				reverse = 1;
			}
		}else if(reverse == 1){
			arm_angle1= arm_angle1-1.5;
			arm_angle2 = arm_angle2 +1.5;
			arm_angle3 = arm_angle3- 1.5;
			arm_angle4 = arm_angle4+1.5;
			if(arm_angle1 == -45&&arm_angle2 == 135){
				reverse = 0;
			}
		}
		if (rebound ==0){
			bag_angle --;
			if(bag_angle ==-45){
				rebound = 1;
			}
		}else if (rebound == 1){
			bag_angle++;
			if(bag_angle == 0){
				rebound = 0;
			}
		}
		if(twist_sig == 0){
			twist_angle = twist_angle +0.5;
			side_1 = side_1 - 0.001125;
			side_2 = side_2 +0.001125;
			if(twist_angle == 22.5){
				twist_sig = 1;
			}
		}else if(twist_sig ==1){
			twist_angle = twist_angle -0.5;
			side_1 = side_1 +0.001125;
			side_2 = side_2 -0.001125;
			if (twist_angle == -22.5){
				twist_sig = 0;
			}
		}
	}
    if( animFlag )
        window.requestAnimFrame(render);
}
function arm_joints(change_time){
	gPush();
	{
		gTranslate(1,0,1);
		gRotate(-45, 0,1,0);
		gPush();
		{
			gTranslate(0,side_1,0.5);
			gRotate(arm_angle1, 1, 0, 0);
			gTranslate(0,0,-0.5);
			gPush();
			{
				gTranslate(0,0,0.5);
				gScale(0.125,0.125,0.125);
				drawSphere();
			}
			gPop();
			gPush();
			{
				gScale(0.25,0.25, 1);
				drawCylinder();
			}
			gPop();
			gPush();
			{
				gTranslate(0,0,-0.5);
				gRotate(arm_angle2,1,0,0);
				gTranslate(0,0,0.5);
				gPush();
				{
					gTranslate(0,0,-0.5);
					gScale(0.125,0.125, 0.125);
					drawSphere();
				}
				gPop();
				gPush();
				{
					gTranslate(0,0,-1);
					gPush();
					{
						gScale(0.25,0.25, 1);
						drawCylinder();
					}
					gPop();
					gPush();
					{
						gTranslate(0,0,-0.75);
						gScale(0.25,0.25,0.25);
						drawSphere();
					}
					gPop();
				}	
				gPop();
			}
			gPop();
		}
		gPop();	
	}
	gPop();
	gPush();
	{
		gTranslate(-1,0,1);
		gRotate(45, 0,1,0);
		gPush();
		{
			gTranslate(0,side_2,0.5);
			gRotate(arm_angle4, 1, 0, 0);
			gTranslate(0,0,-0.5);
			gPush();
			{
				gTranslate(0,0,0.5);
				gScale(0.125,0.125,0.125);
				drawSphere();
			}
			gPop();
			gPush();
			{
				gScale(0.25,0.25, 1);
				drawCylinder();
			}
			gPop();
			gPush();
			{
				gTranslate(0,0,-0.5);
				gRotate(arm_angle3,1,0,0);
				gTranslate(0,0,0.5);
				gPush();
				{
					gTranslate(0,0,-0.5);
					gScale(0.125,0.125, 0.125);
					drawSphere();
				}
				gPop();
				gPush();
				{
					gTranslate(0,0,-1);
					gPush();
					{
						gScale(0.25,0.25, 1);
						drawCylinder();
					}
					gPop();
					gPush();
					{
						gTranslate(0,0,-0.75);
						gScale(0.25,0.25,0.25);
						drawSphere();
					}
					gPop();
				}
				gPop();
			}
			gPop();
		}
		gPop();
	}
	gPop();
}


function leg_joints(change_time){
	gPush();
	{
		gTranslate(0.25,0,-2.5);
		gPush();
		{
			gTranslate(0,side_1,1);
			gRotate(45, 1, 0, 0);
			gTranslate(0,0,-1);
			gPush();
			{
				gScale(0.15,0.15, 1);
				drawCube();
			}
			gPop();
			gPush();
			{
				gTranslate(0,0,-2);
				gPush();
				{
					gTranslate(0,0,1);
					gRotate(-45, 1,0,0);
					gTranslate(0,0,-1);
					gPush();
					{
						gScale(0.15,0.15, 1);
						drawCube();
					}
					gPop();
					gPush();
					{
						gTranslate(0,0.2,-1);
						gScale(0.20,0.45,0.1);
						drawCube();
					}
					gPop();
				}
				gPop();
			}
			gPop();
		}
		gPop();
	}
	gPop();
	gPush();
	{
		gTranslate(-0.25,0,-2.5);
		gPush();
		{
			gTranslate(0,side_2,1);
			gRotate(-5, 1,0,0);
			gTranslate(0,0,-1);
			gPush();
			{
				gScale(0.15,0.15, 1);
				drawCube();
			}		
			gPop();
			gPush();
			{
				gTranslate(0,0,-2);
				gPush();
				{
					gTranslate(0,0,1);
					gRotate(-40, 1, 0,0);
					gTranslate(0,0,-1);
					gPush();
					{
						gScale(0.15,0.15, 1);
						drawCube();
					}	
					gPop();
					gPush();
					{
						gTranslate(0,0.2,-1);
						gPush();
						{
							gTranslate(0, 0, 0.2);
							gRotate(40, 1,0,0);
							gTranslate(0,0,-0.2);
							gPush();
							{
								gScale(0.20,0.45,0.1);
								drawCube();
							}
							gPop();
						}
						gPop();
					}
					gPop();
				}
				gPop();
			}
			gPop();
		}
		gPop();
	}
	gPop();
}

function Punching_bag(){
	gTranslate(1.3,0,3);
	gPush();
	{
		gTranslate(0,0,1.5);
		gRotate(bag_angle, 0,1,0);
		gTranslate(0,0,-1.5);
		gPush();
		{
			gScale(2.5,2.5,3);
			drawCylinder();
		}
		gPop();
		gPush();
		{
			gTranslate(0,0,1.5);
			gScale(1.25,1.25,1);
			drawSphere();
		}
		gPop();
		gPush();
		{
			gTranslate(0,0,-1.5);
			gScale(1.25, 1.25, 1);
			drawSphere();
		}
		gPop();
	}
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
