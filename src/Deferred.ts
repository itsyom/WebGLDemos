/**
 * Created by ll on 2017/7/26.
 */

///<reference path="../node_modules/@types/webgl2/index.d.ts"/>
///<reference path="./Matrix4.ts"/>
namespace Demo.Deferred{


    let vs_geometry = `#version 300 es
        
        layout(location = 0) in vec4 position;
        layout(location = 1) in vec3 normal;
        layout(location = 2) in vec2 uv;
        
        layout(std140,column_major) uniform;
        
        uniform Matrices{
            mat4 uModelMatrix;
            mat4 uMVP;
        };
        
        out vec4 v_position;
        out vec3 v_normal;
        out vec2 v_uv;
        
        void main(){
            gl_Position = uMVP*position;
            
            v_position = uModelMatrix*position;
            v_normal = (uModelMatrix*vec4(normal,0.)).xyz;
            v_uv = uv;
        }
    `;

    let fs_geometry = `#version 300 es
        precision highp float;
        in vec4 v_position;
        in vec3 v_normal;
        in vec2 v_uv;
        
        uniform sampler2D uTextureMap;
        
        layout(location = 0) out vec4 fragPosition;
        layout(location = 1) out vec4 fragNormal;
        layout(location = 2) out vec2 fragUV;
        layout(location = 3) out vec4 fragColor;
        void main(){
            fragPosition = v_position;
            fragNormal = vec4(normalize(v_normal),0.);
            fragUV = v_uv;
            fragColor = texture(uTextureMap,v_uv);
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
        uniform sampler2D uColorBuffer;
        uniform sampler2D uDepthBuffer;
        
        float near_plane = 0.1;
        float far_plane = 10.;
        
        float LinearizeDepth(float depth)
        {   
            float z = depth * 2.0 - 1.0; // Back to NDC 
            return (2.0 * near_plane * far_plane) / (far_plane + near_plane - z * (far_plane - near_plane));
        }
        
        out vec4 fragColor;
        
        void main(){
            ivec2 fragCoord = ivec2(gl_FragCoord.xy);
            
            vec3 position = texelFetch(uPositionBuffer,fragCoord,0).rgb;
            vec3 normal = texelFetch(uNormalBuffer,fragCoord,0).rgb;
            vec2 uv = texelFetch(uUVBuffer,fragCoord,0).rg;
            vec4 baseColor = texelFetch(uColorBuffer,fragCoord,0);
            
            vec4 texel1 = texelFetch(uColorBuffer,fragCoord+ivec2(-1,0)*2,0);
            vec4 texel2 = texelFetch(uColorBuffer,fragCoord+ivec2(1,0)*2,0);
            vec4 texel3 = texelFetch(uColorBuffer,fragCoord+ivec2(0,1)*2,0);
            vec4 texel4 = texelFetch(uColorBuffer,fragCoord+ivec2(0,-1)*2,0);
            vec4 texel5 = texelFetch(uColorBuffer,fragCoord+ivec2(-1,0)*1,0);
            vec4 texel6 = texelFetch(uColorBuffer,fragCoord+ivec2(1,0)*1,0);
            vec4 texel7 = texelFetch(uColorBuffer,fragCoord+ivec2(0,1)*1,0);
            vec4 texel8 = texelFetch(uColorBuffer,fragCoord+ivec2(0,-1)*1,0);
            vec4 near = (texel1+texel2+texel3+texel4+texel5+texel6+texel7+texel8)/8.;
            baseColor = mix(baseColor,near,.5);
            
            fragColor = baseColor;
            
            vec3 lightDir = uLight.position.xyz-position;
            vec3 eyeDir = uLight.eyePosition.xyz-position;
            
            lightDir = normalize(lightDir);
            eyeDir = normalize(eyeDir);
            
            float nDotL = max(0.,dot(lightDir,normal));
            
            vec3 reflectionLight = reflect(-lightDir,normal);
            
            vec3 diffuse = uLight.color.rgb*nDotL;
            float ambient = 0.1;
            
            float specular = pow(max(dot(reflectionLight,eyeDir),0.),20.);
            
            fragColor = vec4((ambient+diffuse+specular)*baseColor.rgb,baseColor.a);
        
        }
        
    `;

    let width = window.innerHeight, height = window.innerHeight;

    declare let utils:any ;

    export let gl:WebGL2RenderingContext = null;

    let framebuffer:WebGLFramebuffer = null;

    let vaoBox:WebGLVertexArrayObject = null;

    let vaoPlane:WebGLVertexArrayObject = null;

    let program:WebGLProgram = null;

    let programDefered:WebGLProgram = null;

    let indexUniformBlockMatrices:number = null;

    let bufferUniform:WebGLBuffer = null;

    let matricesUniformBufferData = new Float32Array(32);

    let numBoxVertices:number = null;

    let locationSamplerPosition:WebGLUniformLocation = null;
    let locationSamplerNormal:WebGLUniformLocation = null;
    let locationSamplerUV:WebGLUniformLocation = null;
    let locationSamplerDiffuseMap:WebGLUniformLocation = null;
    let locationSamplerColor:WebGLUniformLocation = null;
    let locationSamplerDepth:WebGLUniformLocation = null;

    let indexUniformBlockLight:number = null;

    let textureColor:WebGLTexture = null;
    let texturePosition:WebGLTexture = null;
    let textureNormal:WebGLTexture = null;
    let textureUV:WebGLTexture = null;
    let textureDiffuseMap:WebGLTexture = null;
    let textureDepth:WebGLTexture = null;


    let lightUniformsBufferData = null;
    let bufferUniformLight:WebGLBuffer = null;

    let boxTransform = {
        scale:[1,1,1],
        rotate:[0,0,0],
        translation:[0,0,0]
    }

    export function init(){
        initMatrices();

        if(!gl.getExtension("EXT_color_buffer_float")){
            console.error("FLOAT color buffer not available");
        }

        texturePosition = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D,texturePosition);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
        gl.texStorage2D(gl.TEXTURE_2D,1,gl.RGBA16F,gl.drawingBufferWidth,gl.drawingBufferHeight);

        textureNormal = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D,textureNormal);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
        gl.texStorage2D(gl.TEXTURE_2D,1,gl.RGBA16F,gl.drawingBufferWidth,gl.drawingBufferHeight);

        textureUV = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D,textureUV);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
        gl.texStorage2D(gl.TEXTURE_2D,1,gl.RG16F,gl.drawingBufferWidth,gl.drawingBufferHeight);

        textureDepth = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D,textureDepth);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
        gl.texStorage2D(gl.TEXTURE_2D,1,gl.DEPTH_COMPONENT16,gl.drawingBufferWidth,gl.drawingBufferHeight);
        // gl.texImage2D(gl.TEXTURE_2D,0,gl.R16F,gl.drawingBufferWidth,gl.drawingBufferHeight,0,gl.RED,gl.UNSIGNED_SHORT,null);

        textureColor = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D,textureColor);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
        gl.texStorage2D(gl.TEXTURE_2D,1,gl.RGBA8,gl.drawingBufferWidth,gl.drawingBufferHeight);

        framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texturePosition,0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT1,gl.TEXTURE_2D,textureNormal,0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT2,gl.TEXTURE_2D,textureUV,0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT3,gl.TEXTURE_2D,textureColor,0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,textureDepth,0);

        gl.drawBuffers([
            gl.COLOR_ATTACHMENT0,
            gl.COLOR_ATTACHMENT1,
            gl.COLOR_ATTACHMENT2,
            gl.COLOR_ATTACHMENT3
        ])

        gl.bindFramebuffer(gl.FRAMEBUFFER,null);


        initProgram();

        vaoBox = gl.createVertexArray();
        gl.bindVertexArray(vaoBox);

        let box:any = utils.createBox();
        // let box:any = utils.createBox({dimensions:[10,10,10]});
        numBoxVertices = box.positions.length/3;

        let bufferNormal = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,bufferNormal);
        gl.bufferData(gl.ARRAY_BUFFER,box.normals,gl.STATIC_DRAW);
        gl.vertexAttribPointer(1,3,gl.FLOAT,false,0,0);
        gl.enableVertexAttribArray(1);

        let bufferPosition = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,bufferPosition);
        gl.bufferData(gl.ARRAY_BUFFER,box.positions,gl.STATIC_DRAW);
        gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
        gl.enableVertexAttribArray(0);

        let bufferUV = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,bufferUV);
        gl.bufferData(gl.ARRAY_BUFFER,box.uvs,gl.STATIC_DRAW);
        gl.vertexAttribPointer(2,2,gl.FLOAT,false,0,0);
        gl.enableVertexAttribArray(2);

        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER,null);

        //UBO
        bufferUniform = gl.createBuffer();
        gl.bindBuffer(gl.UNIFORM_BUFFER,bufferUniform);
        gl.bufferData(gl.UNIFORM_BUFFER,matricesUniformBufferData,gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.UNIFORM_BUFFER,null);


        let plane = utils.createPlane();

        vaoPlane = gl.createVertexArray();
        gl.bindVertexArray(vaoPlane);

        let bufferPositionPlane = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,bufferPositionPlane);
        gl.bufferData(gl.ARRAY_BUFFER,plane.positions,gl.STATIC_DRAW);
        gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
        gl.enableVertexAttribArray(0);

        let bufferUVPlane = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,bufferUVPlane);
        gl.bufferData(gl.ARRAY_BUFFER,plane.uvs,gl.STATIC_DRAW);
        gl.vertexAttribPointer(1,2,gl.FLOAT,false,0,0);
        gl.enableVertexAttribArray(1);

        gl.bindBuffer(gl.ARRAY_BUFFER,null);
        gl.bindVertexArray(null);

        //UBO
        bufferUniformLight = gl.createBuffer();
        gl.bindBuffer(gl.UNIFORM_BUFFER,bufferUniformLight);
        gl.bufferData(gl.UNIFORM_BUFFER,lightUniformsBufferData,gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.UNIFORM_BUFFER,null);

        initDiffuseMap();

        loadImage();
    }

    function loadImage(){
        let image = new Image();
        image.onload = function(){
            gl.bindTexture(gl.TEXTURE_2D,textureDiffuseMap);
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
            gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,image.width,image.height,0,gl.RGBA,gl.UNSIGNED_BYTE,image);

            gl.generateMipmap(gl.TEXTURE_2D);
            gl.bindTexture(gl.TEXTURE_2D,null);
        }
        image.src = "../assets/khronos_webgl.png";
    }

    let view = mat4.create();
    let projection = mat4.create();
    let vp = mat4.create();
    function initMatrices(){
        let model = mat4.create();
        view = mat4.create();
        projection = mat4.create();
        mat4.lookAt([1,1,1],[0,0,0],[0,1,0],view);
        mat4.inverse(view,view);

        mat4.perspective(90,width/height,0.1,10,projection);

        vp = mat4.multiply(projection,view,vp);

        let mv = mat4.create();
        mat4.multiply(view,model,mv);

        let mvp = mat4.create();
        mat4.multiply(projection,mv,mvp);

        matricesUniformBufferData.set(model);
        matricesUniformBufferData.set(mvp,16);

        lightUniformsBufferData = new Float32Array(12);
        let lightPosition = [1,1,1,0];
        let lightColor = [0.4,0.5,0.6,0];
        let eyePosition = [0,0,10,0];

        lightUniformsBufferData.set(lightPosition);
        lightUniformsBufferData.set(lightColor,4);
        lightUniformsBufferData.set(eyePosition,8);

    }


    function initDiffuseMap(){

        let textureData = new Uint8Array([255,255,0,255]);

        textureDiffuseMap = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D,textureDiffuseMap);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,textureData);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.bindTexture(gl.TEXTURE_2D,null);

    }

    function initProgram(){
        let shader = new Shader(vs_geometry,fs_geometry,gl);
        program = shader.program;
        indexUniformBlockMatrices = gl.getUniformBlockIndex(program,"Matrices");
        locationSamplerDiffuseMap = gl.getUniformLocation(program,"uTextureMap");

        shader = new Shader(vs_defered,fs_defered,gl);
        programDefered = shader.program;

        locationSamplerPosition = gl.getUniformLocation(programDefered,"uPositionBuffer");
        locationSamplerNormal = gl.getUniformLocation(programDefered,"uNormalBuffer");
        locationSamplerUV = gl.getUniformLocation(programDefered,"uUVBuffer");
        locationSamplerColor = gl.getUniformLocation(programDefered,"uColorBuffer");
        locationSamplerDepth = gl.getUniformLocation(programDefered,"uDepthBuffer");

        indexUniformBlockLight = gl.getUniformBlockIndex(programDefered,"LightUniforms");
    }


    export function render(){
        gl.viewport(0,0,window.innerWidth,window.innerHeight);

        gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
        gl.clearColor(0,0,0,1);
        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

        gl.enable(gl.DEPTH_TEST);

        gl.bindVertexArray(vaoBox);

        gl.useProgram(program);

        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D,textureDiffuseMap);
        gl.uniform1i(locationSamplerDiffuseMap,3);

        boxTransform.rotate[0]+=0.01;
        boxTransform.rotate[1]+=0.02;

        let model = mat4.create();
        utils.xformMatrix(model,boxTransform.translation,boxTransform.rotate,boxTransform.scale);
        let mvp = mat4.multiply(vp,model,[]);
        matricesUniformBufferData.set(model);
        matricesUniformBufferData.set(mvp,16);
        //UBO
        gl.bindBufferBase(gl.UNIFORM_BUFFER,indexUniformBlockMatrices,bufferUniform);
        gl.bufferSubData(gl.UNIFORM_BUFFER,0,matricesUniformBufferData);

        gl.drawArrays(gl.TRIANGLES,0,numBoxVertices);
        gl.bindVertexArray(null);

        let debug = false;
        if(!debug){
            //gbuffer pass
            gl.disable(gl.DEPTH_TEST);

            gl.bindFramebuffer(gl.FRAMEBUFFER,null);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.bindVertexArray(vaoPlane);
            gl.useProgram(programDefered);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D,texturePosition);
            gl.uniform1i(locationSamplerPosition,0);

            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D,textureNormal);
            gl.uniform1i(locationSamplerNormal,1);

            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D,textureUV);
            gl.uniform1i(locationSamplerUV,2);

            gl.activeTexture(gl.TEXTURE4);
            gl.bindTexture(gl.TEXTURE_2D,textureColor);
            gl.uniform1i(locationSamplerColor,4);

            gl.activeTexture(gl.TEXTURE5);
            gl.bindTexture(gl.TEXTURE_2D,textureDepth);
            gl.uniform1i(locationSamplerDepth,5);

            //UBO
            gl.bindBufferBase(gl.UNIFORM_BUFFER,indexUniformBlockLight,bufferUniformLight);

            gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
            gl.bindVertexArray(null);
        }
    }





}