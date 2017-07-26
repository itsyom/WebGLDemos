/**
 * Created by ll on 2017/7/20.
 */

namespace Demo.UBO{

    let vs = `#version 300 es
        
        layout(location = 0) in vec2 position;
        
        void main(){
            gl_Position = vec4(position,0.,1.);
        }
    `;

    let fs = `#version 300 es
        precision highp float;
        
        layout(std140) uniform colors{
            float red;
            float a[1];
        };
        
        out vec4 color;
        void main(){
            color = vec4(vec3(red*a[0],0.,0.),1.);
        }
    `;

    let vertices = new Float32Array([
        -1,-1,
        -1,1,
        1,-1,
        1,1
    ]);

    let indices = new Uint16Array([
        0,1,2,3
    ]);

    export let gl:WebGLRenderingContext = null;

    let vao:number = null;
    let program:WebGLProgram = null;

    let uniformIndex:number = null;

    let colorsBuffer:WebGLBuffer = null;

    export function init(){

        initGeometry();
        initShader();

        initUniformBuffer();
    }

    function initGeometry(){
        let positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER,null);

        let indicesBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indicesBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,null);

        vao = any(gl).createVertexArray();
        any(gl).bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER,positionBuffer);
        gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
        gl.enableVertexAttribArray(0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indicesBuffer);
        any(gl).bindVertexArray(null);
    }
    
    function initUniformBuffer(){
        let colors = new Float32Array([
            0.1,0,0,0,
            1.,0,0,0//array's base aligment is vec4
        ]);

        colorsBuffer = gl.createBuffer();
        gl.bindBuffer(any(gl).UNIFORM_BUFFER,colorsBuffer);
        gl.bufferData(any(gl).UNIFORM_BUFFER,colors,gl.STATIC_DRAW);
    }

    function initShader(){
        let shader = new Shader(vs,fs,gl);
        program = shader.program;
        uniformIndex = any(gl).getUniformBlockIndex(program,"colors");
    }

    export function render(){
        any(gl).bindVertexArray(vao);

        gl.useProgram(program);

        any(gl).bindBufferBase(any(gl).UNIFORM_BUFFER,uniformIndex,colorsBuffer);

        gl.drawElements(gl.TRIANGLE_STRIP,4,gl.UNSIGNED_SHORT,0);

        any(gl).bindVertexArray(null);
    }


}

