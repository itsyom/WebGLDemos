/**
 * Created by ll on 2017/7/10.
 */


namespace Demo.Shadow{

    let vertex_simpleDepthShader = `#version 300 es
        
        layout(location = 0) in vec3 position;   
           
        uniform mat4 lightSpaceMatrix;
        uniform mat4 model;
        
        void main(){
            gl_Position = lightSpaceMatrix*model*position;
        }
    
    `;

    let fragment_simpleDepthShader = `#version 300 es
        precision highp float;
        void main(){
            
        }
    `;

    let vertex_sceneShader = `#version 300 es
        layout(location = 0) in vec3 position;
        
        uniform mat4 projection;
        uniform mat4 view;
        uniform mat4 model;
        
        void main(){
            gl_Position = projection*view*model*vec4(position,1.);
        }
    `;

    let fragment_sceneShader = `#version 300 es
        precision highp float;
        
        out vec4 color;
        void main(){
        
           color = vec4(.5);
        }
    `;


    export let gl:WebGLRenderingContext = null;

    let framebuffer:WebGLFramebuffer = null;

    let shadowProgram:WebGLProgram = null;

    let lightSpaceMatrix:number[] = null;


    let width:number = 0,height:number = 0;

    export function init(w:number,h:number){
        width = w;
        height = h;

        initShader();


    }

    function initFrameBuffer(){
        let depthTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D,depthTexture);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT,width,height,0,gl.DEPTH_COMPONENT,gl.FLOAT,null);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);

        framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,depthTexture,0);

        any(gl).drawBuffers([gl.NONE]);
        any(gl).readBuffer(gl.NONE);

        gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    }

    function configShaderAndMatrix(){
        let shader = new Shader(vertex_simpleDepthShader,fragment_simpleDepthShader,gl);
        shadowProgram = shader.program;

        let projection = mat4.ortho(-10,10,-10,10,1,7.5,[]);
        let view = mat4.lookAt([-100,100,0],[0,0,0],[0,1,0],[]);

        lightSpaceMatrix = mat4.multiply(projection,view,[]);

        // gl.useProgram(shadowProgram);
        // let loc = gl.getUniformLocation(shadowProgram,"lightSpaceMatrix");
        // gl.uniformMatrix4fv(loc,false,lightSpaceMatrix);
    }

    let sceneProgram:WebGLProgram = null;
    function initShader(){
        let shader = new Shader(vertex_sceneShader,fragment_sceneShader,gl);

        sceneProgram = shader.program;
    }


    function renderScene(program:WebGLProgram){

        let model = mat4.create();
        gl.uniformMatrix4fv(gl.getUniformLocation(program,"model"),false,model);

        renderFloor();



    }

    let floorVao:number = null;
    function renderFloor(){
        let floorVertices = new Float32Array([
            // Positions          // Normals         // Texture Coords
            25.0, -0.5, 25.0, 0.0, 1.0, 0.0, 25.0, 0.0,
            -25.0, -0.5, -25.0, 0.0, 1.0, 0.0, 0.0, 25.0,
            -25.0, -0.5, 25.0, 0.0, 1.0, 0.0, 0.0, 0.0,

            25.0, -0.5, 25.0, 0.0, 1.0, 0.0, 25.0, 0.0,
            25.0, -0.5, -25.0, 0.0, 1.0, 0.0, 25.0, 25.0,
            - 25.0, -0.5, -25.0, 0.0, 1.0, 0.0, 0.0, 25.0
        ]);
        if(floorVao === null){
            floorVao = any(gl).createVertexArray();
            any(gl).bindVertexArray(floorVao);

            let vbo = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER,vbo);
            gl.bufferData(gl.ARRAY_BUFFER,floorVertices,gl.STATIC_DRAW);

            gl.vertexAttribPointer(0,3,gl.FLOAT,false,8*4,0);
            gl.enableVertexAttribArray(0);


            any(gl).bindVertexArray(null);
            gl.bindBuffer(gl.ARRAY_BUFFER,null);
        }

        any(gl).bindVertexArray(floorVao);
        gl.drawArrays(gl.TRIANGLES,0,6);
        any(gl).bindVertexArray(null);
    }



    let projectionScene:number[] = [];
    let viewScene:number[] = [];

    export function render(){

        gl.useProgram(sceneProgram);

        projectionScene = mat4.perspective(45,width/height,1,100,projectionScene);
        viewScene = mat4.create();

        gl.uniformMatrix4fv(gl.getUniformLocation(sceneProgram,"projection"),false,projectionScene);
        gl.uniformMatrix4fv(gl.getUniformLocation(sceneProgram,"view"),false,viewScene);

        let modelFloor = mat4.create();
        gl.uniformMatrix4fv(gl.getUniformLocation(sceneProgram,"model"),false,modelFloor);

        renderFloor();

    }

    let vertices_cube = new Float32Array([
        // Back face
        -0.5, -0.5, -0.5, 0.0, 0.0, -1.0, 0.0, 0.0, // Bottom-left
        0.5, 0.5, -0.5, 0.0, 0.0, -1.0, 1.0, 1.0, // top-right
        0.5, -0.5, -0.5, 0.0, 0.0, -1.0, 1.0, 0.0, // bottom-right
        0.5, 0.5, -0.5, 0.0, 0.0, -1.0, 1.0, 1.0,  // top-right
        -0.5, -0.5, -0.5, 0.0, 0.0, -1.0, 0.0, 0.0,  // bottom-left
        -0.5, 0.5, -0.5, 0.0, 0.0, -1.0, 0.0, 1.0,// top-left
        // Front face
        -0.5, -0.5, 0.5, 0.0, 0.0, 1.0, 0.0, 0.0, // bottom-left
        0.5, -0.5, 0.5, 0.0, 0.0, 1.0, 1.0, 0.0,  // bottom-right
        0.5, 0.5, 0.5, 0.0, 0.0, 1.0, 1.0, 1.0,  // top-right
        0.5, 0.5, 0.5, 0.0, 0.0, 1.0, 1.0, 1.0, // top-right
        -0.5, 0.5, 0.5, 0.0, 0.0, 1.0, 0.0, 1.0,  // top-left
        -0.5, -0.5, 0.5, 0.0, 0.0, 1.0, 0.0, 0.0,  // bottom-left
        // Left face
        -0.5, 0.5, 0.5, -1.0, 0.0, 0.0, 1.0, 0.0, // top-right
        -0.5, 0.5, -0.5, -1.0, 0.0, 0.0, 1.0, 1.0, // top-left
        -0.5, -0.5, -0.5, -1.0, 0.0, 0.0, 0.0, 1.0,  // bottom-left
        -0.5, -0.5, -0.5, -1.0, 0.0, 0.0, 0.0, 1.0, // bottom-left
        -0.5, -0.5, 0.5, -1.0, 0.0, 0.0, 0.0, 0.0,  // bottom-right
        -0.5, 0.5, 0.5, -1.0, 0.0, 0.0, 1.0, 0.0, // top-right
        // Right face
        0.5, 0.5, 0.5, 1.0, 0.0, 0.0, 1.0, 0.0, // top-left
        0.5, -0.5, -0.5, 1.0, 0.0, 0.0, 0.0, 1.0, // bottom-right
        0.5, 0.5, -0.5, 1.0, 0.0, 0.0, 1.0, 1.0, // top-right
        0.5, -0.5, -0.5, 1.0, 0.0, 0.0, 0.0, 1.0,  // bottom-right
        0.5, 0.5, 0.5, 1.0, 0.0, 0.0, 1.0, 0.0,  // top-left
        0.5, -0.5, 0.5, 1.0, 0.0, 0.0, 0.0, 0.0, // bottom-left
        // Bottom face
        -0.5, -0.5, -0.5, 0.0, -1.0, 0.0, 0.0, 1.0, // top-right
        0.5, -0.5, -0.5, 0.0, -1.0, 0.0, 1.0, 1.0, // top-left
        0.5, -0.5, 0.5, 0.0, -1.0, 0.0, 1.0, 0.0,// bottom-left
        0.5, -0.5, 0.5, 0.0, -1.0, 0.0, 1.0, 0.0, // bottom-left
        -0.5, -0.5, 0.5, 0.0, -1.0, 0.0, 0.0, 0.0, // bottom-right
        -0.5, -0.5, -0.5, 0.0, -1.0, 0.0, 0.0, 1.0, // top-right
        // Top face
        -0.5, 0.5, -0.5, 0.0, 1.0, 0.0, 0.0, 1.0,// top-left
        0.5, 0.5, 0.5, 0.0, 1.0, 0.0, 1.0, 0.0, // bottom-right
        0.5, 0.5, -0.5, 0.0, 1.0, 0.0, 1.0, 1.0, // top-right
        0.5, 0.5, 0.5, 0.0, 1.0, 0.0, 1.0, 0.0, // bottom-right
        -0.5, 0.5, -0.5, 0.0, 1.0, 0.0, 0.0, 1.0,// top-left
        -0.5, 0.5, 0.5, 0.0, 1.0, 0.0, 0.0, 0.0 // bottom-left
    ]);

    let vaoCube:number = null;

    function initCubeVao(){
        vaoCube = any(gl).createVertexArray();
        any(gl).bindVertexArray(vaoCube);

        let vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,vbo);
        gl.bufferData(gl.ARRAY_BUFFER,vertices_cube,gl.STATIC_DRAW);

        gl.vertexAttribPointer(0,3,gl.FLOAT,false,32,0);
        gl.enableVertexAttribArray(0);

        any(gl).bindVertexArray(null);

        gl.bindBuffer(gl.ARRAY_BUFFER,null);
    }

    function renderCube(){

        let model:number[] = mat4.create();




    }







}