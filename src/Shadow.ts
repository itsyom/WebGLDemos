/**
 * Created by ll on 2017/7/10.
 */


namespace Demo.Shadow{

    let vertex_simpleDepthShader = `#version 300 es
        
        layout(location = 0) in vec3 position;   
           
        uniform mat4 lightSpaceMatrix;
        uniform mat4 model;
        
        void main(){
            gl_Position = lightSpaceMatrix*model*vec4(position,1.);
        }
    
    `;

    let fragment_simpleDepthShader = `#version 300 es
        precision highp float;
        
        uniform vec3 diffuseColor;
        
        out vec4 color;
        void main(){
            color = vec4(vec3(diffuseColor),1.);
        }
    `;

    let vertex_sceneShader = `#version 300 es
        layout(location = 0) in vec3 position;
        
        uniform mat4 projection;
        uniform mat4 view;
        uniform mat4 model;
        
        out vec4 fragPosLightSpace;
        uniform mat4 lightSpaceMatrix;
        
        void main(){
            gl_Position = projection*view*model*vec4(position,1.);
            
            fragPosLightSpace = lightSpaceMatrix*model*vec4(position,1.);
        }
    `;

    let fragment_sceneShader = `#version 300 es
        precision highp float;
        
        out vec4 color;
        
        uniform vec3 diffuseColor;
        
        uniform sampler2D depthMap;
        
        in vec4 fragPosLightSpace;
        
        float shadowCalculation(vec4 fragPosLightSpace){
            vec3 projCoords = fragPosLightSpace.xyz/fragPosLightSpace.w;
            projCoords = projCoords*0.5+0.5;
            
            float closestDepth = texture(depthMap,projCoords.xy).r;
            float currentDepth = projCoords.z;
            
            float shadow = currentDepth > closestDepth? 1.0:0.;
            return shadow;
        }
        
        void main(){
            float shadow = shadowCalculation(fragPosLightSpace);
            color = vec4(diffuseColor*(1.-shadow),1.);
           color = vec4(vec3(shadow),1.);
        }
    `;


    let vertex_debugShader = `#version 300 es
        layout(location = 0) in vec2 position;
        
        
        out vec2 uv;
        void main(){
            gl_Position = vec4(position,0,1);
            
            uv = position*0.5+0.5;
        }
        
    `;

    let fragment_debugShader = `#version 300 es
        precision highp float;
        uniform sampler2D depthTexture;
        
        in vec2 uv;
        
        out vec4 color;
        void main(){
            
            float depthValue = texture(depthTexture, uv).r;
            // depthValue = 0.5;
            color = vec4(vec3(depthValue), 1.0);
        }
    `;

    let verticesQuad = new Float32Array([

        -1,1, -1,-1, 1,1,

        1,1, -1,-1, 1,-1

    ]);


    export let gl:WebGLRenderingContext = null;

    let framebuffer:WebGLFramebuffer = null;

    let programShadow:WebGLProgram = null;

    let lightSpaceMatrix:number[] = null;

    let width:number = 0,height:number = 0;

    let width_shadow = 1024, height_shadow = 1024;

    export function init(w:number,h:number){
        width = w;
        height = h;

        initShaders();

        configShaderAndMatrix();

        initFrameBuffer();
    }

    let textureDepth:WebGLTexture = null;
    function initFrameBuffer(){
        textureDepth = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D,textureDepth);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT16,width,height,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_SHORT,null);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);

        framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,textureDepth,0);

        any(gl).drawBuffers([gl.NONE]);
        any(gl).readBuffer(gl.NONE);

        gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    }

    function configShaderAndMatrix(){
        let shader = new Shader(vertex_simpleDepthShader,fragment_simpleDepthShader,gl);
        programShadow = shader.program;

        let projection = mat4.ortho(-10,10,-10,10,1,7.5,[]);
        let view = mat4.lookAt([-2,4,-1],[0,0,0],[0,1,0],[1,1,1]);

        let viewInverse = mat4.inverse(view,[]);

        lightSpaceMatrix = mat4.multiply(projection,viewInverse,[]);
    }

    let programScene:WebGLProgram = null;
    let programDebug:WebGLProgram = null;
    function initShaders(){
        let shader = new Shader(vertex_sceneShader,fragment_sceneShader,gl);
        programScene = shader.program;

        shader = new Shader(vertex_debugShader,fragment_debugShader,gl);
        programDebug = shader.program;
    }




    let projectionScene:number[] = [];
    let viewScene:number[] = [];

    export function render(){
        gl.viewport(0,0,width_shadow,height_shadow);
        // gl.viewport(0,0,width,height);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        gl.useProgram(programShadow);
        gl.uniformMatrix4fv(gl.getUniformLocation(programShadow,"lightSpaceMatrix"),false,lightSpaceMatrix);

        gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        renderScene(programShadow);
        gl.bindFramebuffer(gl.FRAMEBUFFER,null);

        //render texture to quad
        // gl.useProgram(programDebug);
        // gl.activeTexture(gl.TEXTURE0);
        // gl.bindTexture(gl.TEXTURE_2D,textureDepth);
        //
        // gl.uniform1i(gl.getUniformLocation(programDebug,"depthTexture"),0);
        //
        // gl.viewport(0,0,width,height);
        // renderQuad();

        gl.useProgram(programScene);
        projectionScene = mat4.perspective(45,width/height,1,1000,projectionScene);
        viewScene = mat4.create();

        viewScene = mat4.lookAt([0,3,20],[0,0,0],[0,1,0],viewScene);
        viewScene = mat4.inverse(viewScene,viewScene);

        gl.uniformMatrix4fv(gl.getUniformLocation(programScene,"projection"),false,projectionScene);
        gl.uniformMatrix4fv(gl.getUniformLocation(programScene,"view"),false,viewScene);

        let modelFloor = mat4.create();
        gl.uniformMatrix4fv(gl.getUniformLocation(programScene,"model"),false,modelFloor);

        gl.viewport(0,0,width,height);
        gl.uniformMatrix4fv(gl.getUniformLocation(programScene,"lightSpaceMatrix"),false,lightSpaceMatrix);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D,textureDepth);
        gl.uniform1i(gl.getUniformLocation(programScene,"depthMap"),0);

        renderScene(programScene);
    }

    function renderScene(program:WebGLProgram){
        let model = mat4.create();
        gl.uniformMatrix4fv(gl.getUniformLocation(program,"model"),false,model);
        gl.uniform3fv(gl.getUniformLocation(program,"diffuseColor"),[0.5,0.5,0.5]);

        renderFloor(program);

        mat4.setCol(model,3,[0,1,0,1]);
        gl.uniformMatrix4fv(gl.getUniformLocation(program,"model"),false,model);
        gl.uniform3fv(gl.getUniformLocation(program,"diffuseColor"),[1.,0.5,0.5]);
        renderCube(program);
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

        if(vaoCube !== null) return;

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

    function renderCube(program:WebGLProgram){
        initCubeVao();

        let model:number[] = mat4.create();
        // mat4.scale(model,[3,3,3],model);
        mat4.setCol(model,3,[0,1,0,1]);

        gl.uniformMatrix4fv(gl.getUniformLocation(program,"model"),false,model);
        gl.uniform3fv(gl.getUniformLocation(program,"diffuse"),[1,0,0]);

        any(gl).bindVertexArray(vaoCube);
        gl.drawArrays(gl.TRIANGLES,0,36);
        any(gl).bindVertexArray(null);
    }


    let vaoFloor:number = null;
    function renderFloor(program:WebGLProgram){
        let floorVertices = new Float32Array([
            // Positions          // Normals         // Texture Coords
            25.0, -0.5, 25.0, 0.0, 1.0, 0.0, 25.0, 0.0,
            -25.0, -0.5, -25.0, 0.0, 1.0, 0.0, 0.0, 25.0,
            -25.0, -0.5, 25.0, 0.0, 1.0, 0.0, 0.0, 0.0,

            25.0, -0.5, 25.0, 0.0, 1.0, 0.0, 25.0, 0.0,
            25.0, -0.5, -25.0, 0.0, 1.0, 0.0, 25.0, 25.0,
            - 25.0, -0.5, -25.0, 0.0, 1.0, 0.0, 0.0, 25.0
        ]);
        if(vaoFloor === null){
            vaoFloor = any(gl).createVertexArray();
            any(gl).bindVertexArray(vaoFloor);

            let vbo = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER,vbo);
            gl.bufferData(gl.ARRAY_BUFFER,floorVertices,gl.STATIC_DRAW);

            gl.vertexAttribPointer(0,3,gl.FLOAT,false,8*4,0);
            gl.enableVertexAttribArray(0);

            any(gl).bindVertexArray(null);
            gl.bindBuffer(gl.ARRAY_BUFFER,null);
        }

        gl.uniform3fv(gl.getUniformLocation(program,"diffuse"),[1,0.5,0.5]);

        any(gl).bindVertexArray(vaoFloor);
        gl.drawArrays(gl.TRIANGLES,0,6);
        any(gl).bindVertexArray(null);
    }

    let vaoQuad:number = null;
    function renderQuad(program:WebGLProgram = null){

        if(vaoQuad === null){
            vaoQuad = any(gl).createVertexArray();
            any(gl).bindVertexArray(vaoQuad);

            let vbo = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER,vbo);
            gl.bufferData(gl.ARRAY_BUFFER,verticesQuad,gl.STATIC_DRAW);

            gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
            gl.enableVertexAttribArray(0);

            any(gl).bindVertexArray(null);
            gl.bindBuffer(gl.ARRAY_BUFFER,null);
        }

        any(gl).bindVertexArray(vaoQuad);
        gl.drawArrays(gl.TRIANGLES,0,6);
        any(gl).bindVertexArray(null);

    }


}