/**
 * Created by ll on 2017/3/1.
 */

namespace Demo{

    export class Shader{

        program:WebGLProgram = null;

        constructor(v:string,f:string,gl:WebGLRenderingContext){

            let vertexShader = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(vertexShader,v);
            gl.compileShader(vertexShader);

            let succ = gl.getShaderParameter(vertexShader,gl.COMPILE_STATUS);
            if(!succ){
                let log = gl.getShaderInfoLog(vertexShader);
                console.log("compile shader error:",log);
                return ;
            }

            let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(fragmentShader,f);
            gl.compileShader(fragmentShader);

            succ = gl.getShaderParameter(fragmentShader,gl.COMPILE_STATUS);
            if(!succ){
                let log = gl.getShaderInfoLog(fragmentShader);
                console.log(log);
                return;
            }

            let program = gl.createProgram();
            gl.attachShader(program,vertexShader);
            gl.attachShader(program,fragmentShader);
            gl.linkProgram(program);

            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader );

            succ = gl.getProgramParameter(program,gl.LINK_STATUS);
            if(!succ){
                let log = gl.getProgramInfoLog(program);
                console.log(log);
                return;
            }

            this.program = program;
        }

        getWebglProgram(){
            return this.program;
        }

    }

}