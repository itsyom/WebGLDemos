/**
 * Created by ll on 2017/7/28.
 */

namespace Demo.Texture_Projection{

    let vs = `#version 300 es
        layout(location = 0) in vec3 aPosition;
        layout(location = 1) in vec3 aNormal;
        
        uniform mat4 uMVP;
        uniform mat4 uProjection;
        uniform mat4 uMV;
        uniform mat4 uModel;
        
        out vec3 v_position;
        out vec3 v_normal;
        void main(){
            gl_Position = uMVP*vec4(aPosition,1.);
            
            vec4 temp = uProjection*vec4(aPosition,1.);
            v_position = temp.xyz;
            
            v_normal = (uModel*vec4(aNormal,0.)).xyz;
        }
        
    `;

    let fs = `#version 300 es
        precision highp float;
        
        uniform sampler2D uDiffuseMap;
        in vec3 v_position;
        in vec3 v_normal;
        
        out vec4 fragColor;
        void main(){
            vec3 normal = normalize(v_normal);
            fragColor = textureProj(uDiffuseMap,v_position);
            //fragColor = texture(uDiffuseMap,v_position.xy+normal.xy*(.5-v_position.z));
            // fragColor = vec4(normal,1.);
        }
    `


    declare let utils:any;

    export let gl:WebGL2RenderingContext = null;

    let vaoBox:WebGLVertexArrayObject = null;

    let textureDiffuseMap:WebGLTexture = null;

    let viewProjection:number[] = null;
    let viewProjection1:number[] = null;

    let view1:number[] = null;
    let projection1:number[] = null;

    let program:WebGLProgram = null;

    let locationMVP:WebGLUniformLocation = null;
    let locationTextureMap:WebGLUniformLocation = null;
    let locationProjection:WebGLUniformLocation = null;
    let locationMV:WebGLUniformLocation = null;
    let locationModel:WebGLUniformLocation = null;


    let transform:any = {
        scale:[1,1,1],
        rotate:[0,0,0],
        translate:[0,0,0]
    }

    export function init(){

        let box = utils.createBox();

        vaoBox = gl.createVertexArray();
        gl.bindVertexArray(vaoBox);

        let bufferPosition = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,bufferPosition);
        gl.bufferData(gl.ARRAY_BUFFER,box.positions,gl.STATIC_DRAW);
        gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
        gl.enableVertexAttribArray(0);

        let bufferNormal = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,bufferNormal);
        gl.bufferData(gl.ARRAY_BUFFER,box.normals,gl.STATIC_DRAW);
        gl.vertexAttribPointer(1,3,gl.FLOAT,false,0,0);
        gl.enableVertexAttribArray(1);

        gl.bindBuffer(gl.ARRAY_BUFFER,null);
        gl.bindVertexArray(null);

        //init texture
        textureDiffuseMap = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D,textureDiffuseMap);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,0,0,255]));
        gl.bindTexture(gl.TEXTURE_2D,null);

        //init camera
        let view = mat4.lookAt([1,1,1]);
        view = mat4.inverse(view,view);
        let projection = mat4.perspective(90,window.innerWidth/window.innerHeight,0.1,100,[]);
        viewProjection = mat4.multiply(projection,view,[]);

        view1 = mat4.lookAt([1,1,0]);
        view1 = mat4.inverse(view1,view1);
        projection1 = mat4.perspective(90,window.innerWidth/window.innerHeight,0.1,10,[]);
        viewProjection1 = mat4.multiply(projection1,view1,[]);

        //init program
        let shader = new Shader(vs,fs,gl);
        program = shader.program;
        locationMVP = gl.getUniformLocation(program,"uMVP");
        locationTextureMap = gl.getUniformLocation(program,"uTextureMap");
        locationProjection = gl.getUniformLocation(program,"uProjection");
        locationMV = gl.getUniformLocation(program,"uMV");
        locationModel = gl.getUniformLocation(program,"uModel");

        //load image

        let image = new Image();
        image.onload = function(){
            gl.bindTexture(gl.TEXTURE_2D,textureDiffuseMap);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
            gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.bindTexture(gl.TEXTURE_2D,null);

        }

        image.src = "../assets/khronos_webgl.png";
    }

    let time = 0;
    export function render(){
        gl.enable(gl.DEPTH_TEST);
        gl.clearColor(0,0,0,1);
        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

        // time += 0.01;
        gl.useProgram(program);

        let model = mat4.create();

        transform.rotate[1] += 0.01;
        utils.xformMatrix(model,transform.translate,transform.rotate,transform.scale);

        let mvp = mat4.multiply(viewProjection,model,[]);
        gl.uniformMatrix4fv(locationMVP,false,mvp);

        let s = 1.;
        let eye = [Math.sin(time)*s,1,Math.cos(time)*s];
        view1 = mat4.lookAt(eye);
        view1 = mat4.inverse(view1,view1);
        viewProjection1 = mat4.multiply(projection1,view1,[]);

        let mv = mat4.multiply(view1,model,[]);
        gl.uniformMatrix4fv(locationMV,false,mv);

        let mvp1 = mat4.multiply(viewProjection1,model,[]);
        gl.uniformMatrix4fv(locationProjection,false,mvp1);

        gl.uniformMatrix4fv(locationModel,false,model);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D,textureDiffuseMap);
        gl.uniform1i(locationTextureMap,0);

        gl.bindVertexArray(vaoBox);
        gl.drawArrays(gl.TRIANGLES,0,36);
        gl.bindVertexArray(null);

    }




}