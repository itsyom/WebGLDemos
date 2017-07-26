/**
 * Created by ll on 2017/7/26.
 */

///<reference path="../node_modules/@types/webgl2/index.d.ts"/>
namespace Demo.Deferred{


    let vs_geometry = `#version 300 es
        
        layout(location = 0) in vec3 position;
        layout(location = 1) in vec3 normal;
        layout(location = 2) in vec2 uv;
        
        layout(std140,column_major) uniform;
        uniform Matricies{
            mat4 uModelMatrix;
            mat4 uMVP;
        }
        
        out vec3 v_position;
        out vec3 v_normal;
        out vec2 v_uv;
        
        void main(){
            gl_Position = uMVP*position;
            
            v_position = uModelMatrix*position;
            v_normal = uModelMatrix*normal;
            v_uv = uv;
        }
    `;

    let fs_geometry = `#version 300 es
        precision hight float;
        in vec3 v_position;
        in vec3 v_normal;
        in vec2 v_uv;
        
        layout(location = 0) out fragPosition;
        layout(location = 1) out fragNormal;
        layout(location = 2) out fragUV;
        void main(){
            fragPosition = v_position;
            fragNormal = v_normal;
            fragUV = v_uv;
        }
    `;

    let vs_defered = `#version 300 es
        
        layout(location = 0) in vec2 aPosition;
        layout(location = 1) in vec2 aUV;
        
        out vec2 v_UV;
                
        void main(){
            gl_Position = vec4(aPosition,0.,1.);
            v_UV = aUV;
        }
    `;

    let fs_defered = `#version 300 es
        precision highp float;
        in vec2 v_UV;
        
        layout(std140,column_major) uniform;
        
        uniform LightUniforms{
            vec4 position;
            vec4 color; 
            vec4 eyePosition;
        } uLight;
        
        
        uniform sampler2D uPositionBuffer;
        uniform sampler2D uNormalBuffer;
        uniform sampler2D uUVBuffer;
        
        uniform sampler2D uTextureMap;
        
        out vec4 fragColor;
        
        void main(){
            ivec2 fragCoord = ivec2(gl_fragCoord.xy);
            
            vec3 position = textureFetch(uPositionBuffer,fragCoord,0);
            vec3 normal = textureFetch(uNormalBuffer,fragCoord,0);
            vec2 uv = textureFetch(uUVBuffer,fragCoord,0);
            
            vec4 baseColor = texture(uTextureMap,uv);
            
            vec3 lightDir = uLight.uPosition-position;
            vec3 eyeDir = uLight.eyePosition-position;
            
            float nDotL = max(0.,dot(lightDir,normal));
            
            vec3 reflectionLight = reflect(-lightDir,normal);
            
            vec3 diffuse = uLight.rgb*nDotL;
            float ambient = 0.1;
            
            float specular = pow(max(dot(reflectionLight,eyeDir),0.),4.);
            
            fragColor = vec4((ambient+diffuse+specular)*baseColor.rgb,baseColor.a);
        
        }
        
    `;



    declare let utils:any ;

    export let gl:WebGL2RenderingContext = null;

    let framebuffer:WebGLFramebuffer = null;

    let vaoBox:WebGLVertexArrayObject = null;

    let program:WebGLProgram = null;

    let uniformIndex:number = null;

    let bufferUniform:WebGLBuffer = null;

    let uniformBufferData = new Float32Array(128);

    let numBoxVertices:number = null;

    function init(){

        if(gl.getExtension("EXT_color_buffer_float")){
            console.error("FLOAT color buffer not available");
        }

        let texturePosition = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D,texturePosition);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
        gl.texStorage2D(gl.TEXTURE_2D,1,gl.RGBA16F,gl.drawingBufferWidth,gl.drawingBufferHeight);

        let textureNormal = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D,textureNormal);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
        gl.texStorage2D(gl.TEXTURE_2D,1,gl.RGBA16F,gl.drawingBufferWidth,gl.drawingBufferHeight);

        let textureUV = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D,textureUV);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
        gl.texStorage2D(gl.TEXTURE_2D,1,gl.RG16F,gl.drawingBufferWidth,gl.drawingBufferHeight);

        let textureDepth = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D,textureDepth);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
        gl.texStorage2D(gl.TEXTURE_2D,1,gl.DEPTH_COMPONENT16,gl.drawingBufferWidth,gl.drawingBufferHeight);

        framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texturePosition,0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT1,gl.TEXTURE_2D,textureNormal,0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT2,gl.TEXTURE_2D,textureUV,0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT3,gl.TEXTURE_2D,textureDepth,0);

        gl.bindFramebuffer(gl.FRAMEBUFFER,null);


        initProgram();

        vaoBox = gl.createVertexArray();
        gl.bindVertexArray(vaoBox);

        let box:any = utils.createBox();
        numBoxVertices = box.positions.length/3;


        let bufferPosition = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,bufferPosition);
        gl.bufferData(gl.ARRAY_BUFFER,box.positions,gl.STATIC_DRAW);
        gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
        gl.enableVertexAttribArray(0);

        let bufferNormal = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,bufferNormal);
        gl.bufferData(gl.ARRAY_BUFFER,box.normals,gl.STATIC_DRAW);
        gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
        gl.enableVertexAttribArray(1);

        let bufferUV = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,bufferUV);
        gl.bufferData(gl.ARRAY_BUFFER,box.uvs,gl.STATIC_DRAW);
        gl.vertexAttribPointer(2,2,gl.FLOAT,false,0,0);
        gl.enableVertexAttribArray(2);

        gl.bindBuffer(gl.ARRAY_BUFFER,null);
        gl.bindVertexArray(null);

        bufferUniform = gl.createBuffer();



    }

    function initProgram(){
        let shader = new Shader(vs_geometry,fs_geometry,gl);
        program = shader.program;

        gl.getUniformBlockIndex(program,"Matrices");
    }


    function render(){

        gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
        gl.clearColor(0,0,0,1);
        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);


        let model = mat4.create();
        let view = mat4.create();
        let projection = mat4.create();
        mat4.lookAt([0,0,10],[0,0,0],[0,1,0],view);
        mat4.perspective(45,window.innerWidth/window.innerHeight,0.1,100,projection);

        let mv = mat4.create();
        mat4.multiply(view,model,mv);

        let mvp = mat4.create();
        mat4.multiply(projection,mv,mvp);

        uniformBufferData.set(model);
        uniformBufferData.set(mvp,16);

        gl.useProgram(program);

        gl.bindBufferBase(gl.UNIFORM_BUFFER,uniformIndex,bufferUniform);
        gl.bufferSubData(gl.UNIFORM_BUFFER,0,uniformBufferData);

        gl.bindVertexArray(vaoBox);
        gl.drawArrays(gl.TRIANGLES,0,numBoxVertices);
        gl.bindVertexArray(null);






    }





}