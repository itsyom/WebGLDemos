/**
 * Created by hey on 2017/7/9.
 */


namespace Demo.Triangle{

    // import any = Demo.any;
    // import Shader = Demo.Shader;


    export let gl:WebGLRenderingContext = null;

    let vao:number = null;

    let program:WebGLProgram = null;

    let vertices = new Float32Array([
       0,0.5,
        0.5,-0.5,
        -0.5,-0.5
    ]);

    let colors = new Float32Array([
       1.0,0,0,
        0.,1,0,
        0,0,1
    ]);


    let indices = new Uint16Array([
       0,1,2
    ]);


    let shader_vertex = `#version 300 es
        
        layout(location = 0) in vec2 position;
        layout(location = 1) in vec3 color;
        
        out vec3 outColor;
        
        void main(){
            outColor = color;
            gl_Position = vec4(position,1.,1.);
        }
        
    `;

    let shader_fragment = `#version 300 es
        precision highp float;
        in vec3 outColor;
        out vec4 color;
        void main(){
            color = vec4(outColor,1.);
        }
        
    `;

    export function init(w:number,h:number){
        gl.viewport(0,0,w,h);

        initVAO();
        initProgram();
    }


    function initVAO(){

        vao = any(gl).createVertexArray();
        any(gl).bindVertexArray(vao);

        let vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,vbo);
        gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
        gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
        gl.enableVertexAttribArray(0);

        let vbo1 = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,vbo1);
        gl.bufferData(gl.ARRAY_BUFFER,colors,gl.STATIC_DRAW);
        gl.vertexAttribPointer(1,3,gl.FLOAT,false,0,0);
        gl.enableVertexAttribArray(1);


        let vbo2 = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,vbo2);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);

        any(gl).bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER,null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,null);

    }



    function initProgram(){
        let shader = new Shader(shader_vertex,shader_fragment,gl);
        program = shader.program;
    }

    export function render(){

        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

        gl.useProgram(program);
        any(gl).bindVertexArray(vao);
        gl.drawElements(gl.TRIANGLES,3,gl.UNSIGNED_SHORT,0);

        any(gl).bindVertexArray(vao);


    }


}
