const ColorConversion = {
    new: function(){
        return {
            to_int_array_from_uint32_array_for_subcolor: function(uint32_array, subcolor) {

                let ci;
                switch (subcolor) {
                    case "r":
                        ci = 3; break;
                    case "g":
                        ci = 2; break;
                    case "b":
                        ci = 1; break;
                    default:
                        ci = 0;
                }

                const uint8array_rgba = new Uint8ClampedArray(uint32_array.buffer);
                let uint8array_subcolor = new Uint8ClampedArray(uint32_array.length);

                for(let i = 0, i2 = 0; i2 < uint8array_rgba.length; i++, i2 += 4) {

                    uint8array_subcolor[i] = uint8array_rgba[i2+ci];
                }

                return uint8array_subcolor;
            },
            format_hex_color: function(hex) { // Supports #fff (short rgb), #fff0 (short rgba), #e2e2e2 (full rgb) and #e2e2e2ff (full rgba)

                if(typeof hex === "undefined"){

                    return "#00000000";
                } else {

                    let a, b, c, d;
                    let formatted = "";

                    switch(hex.length) {

                        case 9:
                            formatted = hex;
                            break;
                        case 7:
                            formatted = hex.concat("ff");
                            break;
                        case 5:
                            a = hex.charAt(1), b = hex.charAt(2), c = hex.charAt(3), d = hex.charAt(4);
                            formatted =  "#".concat(a, a, b, b, c, c, d, d);
                            break;
                        case 4:
                            a = hex.charAt(1), b = hex.charAt(2), c = hex.charAt(3);
                            formatted = "#".concat(a, a, b, b, c, c, "ff");
                            break;
                    }

                    return formatted;
                }
            },
            blend_colors: function(color_a, color_b, amount = 1, should_return_transparent = false, alpha_addition = false) {

                if(amount === 0 && color_b !== "hover" && should_return_transparent) {return 0;}

                if(color_b === "hover") {

                    let hsla = this.to_hsla_from_rgba(this.to_rgba_from_uint32(color_a));
                    hsla[2] = parseInt(hsla[2] >= 50 ? hsla[2]/2: hsla[2]*2);
                    hsla[3] = Math.max(hsla[3], 100 * (amount/2));
                    color_b = this.to_uint32_from_rgba(this.to_rgba_from_hsla(hsla));
                }

                // If the second color is transparent, return transparent
                if(should_return_transparent && color_b === 0 && amount === 1) { return 0 }

                // Extract RGBA from both colors
                const base = this.to_rgba_from_uint32(color_a);
                const added = this.to_rgba_from_uint32(color_b);

                if(added[3] === 255 && amount === 1) { return color_b }

                const ba3 = base[3] / 255;
                const ad3 = (added[3] / 255) * amount;

                let mix = new Uint8ClampedArray(4);
                let mi3 = 0;

                if (ba3 > 0 && ad3 > 0) {

                    if(alpha_addition) {

                        mi3 = ad3 + ba3;
                    }else {

                        mi3 = 1 - (1 - ad3) * (1 - ba3);
                    }

                    const ao = ad3 / mi3;
                    const bo = ba3 * (1 - ad3) / mi3;

                    mix.set(Uint8ClampedArray.of(
                        parseInt(added[0] * ao + base[0] * bo), // red
                        parseInt(added[1] * ao + base[1] * bo), // green
                        parseInt(added[2] * ao + base[2] * bo)
                    ), 0);// blue

                }else if(ad3 > 0) {

                    mi3 = added[3] / 255;
                    mix.set(added, 0);
                }else {

                    mi3 = base[3] / 255;
                    mix.set(base, 0);
                }

                if(alpha_addition) {
                    mi3 /= 2;
                }

                mix[3] = parseInt(mi3 * 255);

                return this.to_uint32_from_rgba(mix);
            },
            blend_rgba_colors: function(all_base, all_added_in_layers, amount = 1, should_return_transparent = 0, alpha_addition = 0) {

                amount = amount * 65535 | 0
                should_return_transparent = should_return_transparent | 0 > 0;
                alpha_addition = alpha_addition | 0 > 0;
                let used_colors_length = all_base.length / 4 | 0;
                let all_layers_length = all_added_in_layers.length | 0;

                // Blend all color and special ones only starting from the last opaque layer
                let start_layer_indexes = new Uint8ClampedArray(used_colors_length);
                let base = new Uint8ClampedArray(4);
                let added = new Uint8ClampedArray(4);
                let mix = new Uint8ClampedArray(4);
                let float_variables = new Float32Array(6); // ba3, ad3, mi3, ao, bo;

                let start_layer = -1;
                // Browse the full list of pixel colors encoded within 32 bytes of data
                for(let i1 = 0, i4 = 0; i1 < used_colors_length; i1 = i1+1|0, i4 = i4+4|0) {

                    // Compute the layer to start the color addition
                    start_layer = -1;
                    for (let layer_n = all_layers_length - 1; layer_n >= 0; layer_n = layer_n - 1 | 0) {

                        if (start_layer === -1) {

                            if (all_added_in_layers[layer_n][i4 + 3] >= 255) {

                                start_layer = layer_n | 0;
                            }
                        }
                    }
                    start_layer_indexes[i1] = start_layer | 0;
                }

                for(let i1 = 0, i4 = 0; i1 < used_colors_length; i1 = i1+1|0, i4 = i4+4|0) {

                    start_layer = start_layer_indexes[i1] | 0;
                    // Get the first base color to sum up with colors atop of it
                    if(start_layer === -1) { base.set(all_base.slice(i4, i4+4), 0);
                    }else { base.set(all_added_in_layers[start_layer].slice(i4, i4+4), 0);}

                    // Sum up all colors above
                    for(let layer_n = start_layer+1|0; layer_n < all_layers_length; layer_n = layer_n + 1 | 0) {

                        float_variables.fill(amount / 65535, 5, 5);
                        added.set(all_added_in_layers[layer_n].slice(i4, i4+4), 0);

                        if(should_return_transparent && added[3] === 0 && float_variables[6] === 1) {

                            base.fill( 0);
                        }else if(added[3] === 255 && float_variables[6] === 1) {

                            base.set(added, 0);
                        }else {

                            float_variables.fill(base[3] / 255, 0, 0);
                            float_variables.fill(added[3] / 255 * float_variables[6], 1, 1);

                            mix.fill(0);
                            float_variables.fill(0, 2, 2);
                            if (float_variables[0] > 0 && float_variables[1] > 0) {
                                if(alpha_addition) { float_variables.fill(float_variables[0] + float_variables[1], 2, 2); } else { float_variables.fill(1 - (1 - float_variables[1]) * (1 - float_variables[0]), 2, 2);}
                                float_variables.fill(float_variables[1] / float_variables[2], 3, 3);
                                float_variables.fill(float_variables[0] * (1 - float_variables[1]) / float_variables[2], 4, 4);
                                mix.set(Uint8ClampedArray.of(
                                    added[0] * float_variables[3] + base[0] * float_variables[4] | 0, // red
                                    added[1] * float_variables[3] + base[1] * float_variables[4] | 0, // green
                                    added[2] * float_variables[3] + base[2] * float_variables[4] | 0
                                ), 0);// blue
                            }else if(float_variables[1] > 0) {
                                float_variables.fill(added[3] / 255, 2, 2);
                                mix.set(added, 0);
                            }else {
                                float_variables.fill(base[3] / 255, 2, 2);
                                mix.set(base, 0);
                            }
                            if(alpha_addition) {
                                float_variables.fill(float_variables[2] / 2, 2, 2);
                            } mix.fill(float_variables[2] * 255, 3, 3);

                            base.set(mix, 0);
                        }
                    }
                    all_base.set(base, i4);
                }

                return all_base;
            },
            to_hex_from_uint32: function(uint32){
                return "#".concat("00000000".concat(uint32.toString(16)).slice(-8));
            },
            to_hex_from_rgba: function(rgba) {
                return "#".concat("00000000".concat(new Uint32Array(rgba.reverse().buffer)[0].toString(16)).slice(-8));
            },
            to_rgba_from_hex: function(hex) {
                return new Uint8ClampedArray(Uint32Array.of(parseInt(hex.slice(1), 16)).buffer).reverse();
            },
            to_rgba_from_uint32: function(uint32) {
                return new Uint8ClampedArray(Uint32Array.of(uint32).buffer).reverse();
            },
            to_uint32_from_rgba: function(rgba) {
                return new Uint32Array(rgba.reverse().buffer)[0];
            },
            to_uint32_from_hex: function(hex) {
                return parseInt(hex.slice(1), 16);
            },
            to_hsla_from_rgba: function(rgba) {
                let [r, g, b, a] = rgba;
                r /= 255, g /= 255, b /= 255, a /= 255;
                const max = Math.max(r, g, b), min = Math.min(r, g, b);
                let h, s, l = (max + min) / 2;
                if(max == min){
                    h = s = 0; // achromatic
                }else{
                    var d = max - min;
                    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                    switch(max){
                        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                        case g: h = (b - r) / d + 2; break;
                        case b: h = (r - g) / d + 4; break;
                    }
                    h /= 6;
                }
                return Array.of(parseInt(h * 360), parseInt(s * 100), parseInt(l * 100), parseInt(a * 100));
            },
            to_rgba_from_hsla: function(hsla) {

                let [h, s, l, a] = hsla;

                h /= 360;
                s /= 100;
                l /= 100;
                a /= 100;

                let r, g, b;
                if (s === 0) {
                    r = g = b = l;
                } else {
                    function hue_to_rgb(p, q, t) {
                        if (t < 0) t += 1;
                        if (t > 1) t -= 1;
                        if (t < 1 / 6) return p + (q - p) * 6 * t;
                        if (t < 1 / 2) return q;
                        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                        return p;
                    }
                    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                    const p = 2 * l - q;
                    r = hue_to_rgb(p, q, h + 1 / 3);
                    g = hue_to_rgb(p, q, h);
                    b = hue_to_rgb(p, q, h - 1 / 3);
                }
                return Uint8ClampedArray.of(parseInt(r * 255), parseInt(g * 255), parseInt(b * 255), parseInt(a * 255));
            },
            invert_uint32: function(uint32) {
                const [r, g, b, a] = this.to_rgba_from_uint32(uint32);
                return this.to_uint32_from_rgba(Uint8ClampedArray.of(255 - r, 255 - g, 255 - b, a));
            },
            match_color: function(color_a, color_b, threshold) {

                threshold = typeof threshold === "undefined" ? null: threshold;

                if(threshold === 1) {

                    return true;
                }else if(threshold === 0){

                    return color_a === color_b;
                }else {

                    const threshold_256 = parseInt(threshold * 255);

                    const c_a = this.to_rgba_from_uint32(color_a);
                    const c_b = this.to_rgba_from_uint32(color_b);

                    const a_diff = Math.abs(c_a[3] - c_b[3]);
                    const r_diff = Math.abs(c_a[0] - c_b[0]);
                    const g_diff = Math.abs(c_a[1] - c_b[1]);
                    const b_diff = Math.abs(c_a[2] - c_b[2]);

                    const a_diff_ratio = Math.abs(1 - a_diff / 255);

                    if(threshold !== null) {

                        return Boolean(r_diff < threshold_256 && g_diff < threshold_256 && b_diff < threshold_256 && a_diff < threshold_256);
                    }else {

                        return parseFloat(parseInt(r_diff + g_diff + b_diff) / parseInt(255 * 3)) * a_diff_ratio;
                    }
                }
            },
            clean_duplicate_colors(_pxls, _pxl_colors) {

                // Work with Hashtables and Typed Array so it is fast
                let new_pxl_colors_map = new Map();
                let new_pxls = new Array(_pxls.length);

                _pxls.forEach((pxl, iteration) => {

                    const color = _pxl_colors[pxl];
                    let index_of_color = new_pxl_colors_map.get(color) || -1;

                    if(index_of_color === -1) {

                        index_of_color = new_pxl_colors_map.size;
                        new_pxl_colors_map.set(color, index_of_color);
                    }

                    new_pxls[iteration] = index_of_color;
                });

                let new_pxl_colors = new Uint32Array(new_pxl_colors_map.size);
                for (let [key, value] of new_pxl_colors_map) {

                    new_pxl_colors[value] = key;
                }

                return Array.of(new_pxls, new_pxl_colors);
            }
        };
    }
};

module.exports = ColorConversion;