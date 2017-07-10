namespace Demo {

    export class mat3 {

        static create() {
            var dest = [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0];
            return dest;
        };

        static  set(mat: number[], dest: number[]) {
            dest[0] = mat[0];
            dest[1] = mat[1];
            dest[2] = mat[2];
            dest[3] = mat[3];
            dest[4] = mat[4];
            dest[5] = mat[5];
            dest[6] = mat[6];
            dest[7] = mat[7];
            dest[8] = mat[8];
            return dest;
        };

        static identity = function (dest: number[]) {
            dest[0] = 1;
            dest[1] = 0;
            dest[2] = 0;
            dest[3] = 0;
            dest[4] = 1;
            dest[5] = 0;
            dest[6] = 0;
            dest[7] = 0;
            dest[8] = 1;
            return dest;
        };

        static mulVec3(mat: number[], vec: number[], dest: number[]) {
            var x = vec[0], y = vec[1], z = vec[2];
            dest[0] = mat[0] * x + mat[3] * y + mat[6] * z;
            dest[1] = mat[1] * x + mat[4] * y + mat[7] * z;
            dest[2] = mat[2] * x + mat[5] * y + mat[8] * z;
            return dest;
        };

        static mulVec2(mat: number[], vec: number[], dest: number[] = []) {
            let [x, y] = vec;
            dest[0] = mat[0] * x + mat[3] * y + mat[6];
            dest[1] = mat[1] * x + mat[4] * y + mat[7];
            dest[2] = mat[2] * x + mat[5] * y + mat[8];
            return dest;
        }

        static getInverse(mat: number[], dest: number[] = []) {
            let [n11, n21, n31,
                n12, n22, n32,
                n13, n23, n33] = mat;

            let t11 = n33 * n22 - n32 * n23;
            let t12 = n32 * n13 - n33 * n12;
            let t13 = n23 * n12 - n22 * n13;

            let det = n11 * t11 + n21 * t12 + n31 * t13;


            let detInv = 1 / det;

            dest[0] = t11 * detInv;
            dest[1] = ( n31 * n23 - n33 * n21 ) * detInv;
            dest[2] = ( n32 * n21 - n31 * n22 ) * detInv;

            dest[3] = t12 * detInv;
            dest[4] = ( n33 * n11 - n31 * n13 ) * detInv;
            dest[5] = ( n31 * n12 - n32 * n11 ) * detInv;

            dest[6] = t13 * detInv;
            dest[7] = ( n21 * n13 - n23 * n11 ) * detInv;
            dest[8] = ( n22 * n11 - n21 * n12 ) * detInv;

            return dest;


        }

        static transpose(mat: number[], dest: number[]) {
            dest[0] = mat[0];
            dest[1] = mat[3];
            dest[2] = mat[6];
            dest[3] = mat[1];
            dest[4] = mat[4];
            dest[5] = mat[7];
            dest[6] = mat[2];
            dest[7] = mat[5];
            dest[8] = mat[8];
            return dest;
        };

        static transposeLocally(mat: number[], dest: number[]) {
            var a01 = mat[1], a02 = mat[2];
            var a12 = mat[5];

            mat[1] = mat[3];
            mat[2] = mat[6];
            mat[3] = a01;
            mat[5] = mat[7];
            mat[6] = a02;
            mat[7] = a12;
            return mat;
        };

        static toMat4(mat: number[], dest: number[]) {
            dest[0] = mat[0];
            dest[1] = mat[1];
            dest[2] = mat[2];
            dest[3] = 0;

            dest[4] = mat[3];
            dest[5] = mat[4];
            dest[6] = mat[5];
            dest[7] = 0;

            dest[8] = mat[6];
            dest[9] = mat[7];
            dest[10] = mat[8];
            dest[11] = 0;

            dest[12] = 0;
            dest[13] = 0;
            dest[14] = 0;
            dest[15] = 1;

            return dest;
        };

        static lookAt(front: number[], up: number[], dest: number[]) {
            var fx = front[0], fy = front[1], fz = front[2], upx = up[0], upy = up[1], upz = up[2];

            var z0, z1, z2, x0, x1, x2, y0, y1, y2, len;

            //vec3.direction(eye, center, z);
            z0 = -fx;
            z1 = -fy;
            z2 = -fz;

            // normalize (no check needed for 0 because of early return)
            len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
            z0 *= len;
            z1 *= len;
            z2 *= len;

            //vec3.normalize(vec3.cross(up, z, x));
            x0 = upy * z2 - upz * z1;
            x1 = upz * z0 - upx * z2;
            x2 = upx * z1 - upy * z0;
            len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
            if (!len) {
                x0 = 0;
                x1 = 0;
                x2 = 0;
            } else {
                len = 1 / len;
                x0 *= len;
                x1 *= len;
                x2 *= len;
            }

            //vec3.normalize(vec3.cross(z, x, y));
            y0 = z1 * x2 - z2 * x1;
            y1 = z2 * x0 - z0 * x2;
            y2 = z0 * x1 - z1 * x0;

            len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
            if (!len) {
                y0 = 0;
                y1 = 0;
                y2 = 0;
            } else {
                len = 1 / len;
                y0 *= len;
                y1 *= len;
                y2 *= len;
            }

            dest[0] = x0;
            dest[1] = y0;
            dest[2] = z0;
            dest[3] = x1;
            dest[4] = y1;
            dest[5] = z1;
            dest[6] = x2;
            dest[7] = y2;
            dest[8] = z2;

            return dest;
        };

        static str(mat: number[]) {
            return '[' + mat[0] + ', ' + mat[1] + ', ' + mat[2] + ', ' + mat[3] + ', '
                + mat[4] + ', ' + mat[5] + ', ' + mat[6] + ', ' + mat[7] + ', '
                + mat[8] + ']';
        };

    }

}