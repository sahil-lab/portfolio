import bpy
import json
from mathutils import Vector

image = bpy.data.images["dog_basecolor"]
pixels = list(image.pixels)
width, height = image.size
results = []
for name in ("DOG_BODY_RETOPO", "DOG_EAR_L", "DOG_EAR_R", "DOG_TAIL"):
    obj = bpy.data.objects[name]
    uv_map = obj.data.uv_layers.active
    vertex_color = obj.data.color_attributes["DOG_CoatColor"]
    black = 0
    expected_white = 0
    black_on_white = 0
    error = 0
    samples = 0
    for face in obj.data.polygons:
        texture = sum((uv_map.data[index].uv for index in face.loop_indices), Vector((0,0)))/len(face.loop_indices)
        column = min(width-1,max(0,int(texture.x*width)))
        row = min(height-1,max(0,int(texture.y*height)))
        actual = pixels[(row*width+column)*4:(row*width+column)*4+3]
        expected = [sum(vertex_color.data[index].color[channel] for index in face.loop_indices)/len(face.loop_indices) for channel in range(3)]
        brightness = sum(actual)/3
        is_white = sum(expected)/3>.45
        black += brightness<.005
        expected_white += is_white
        black_on_white += is_white and brightness<.005
        error += sum(abs(first-second) for first,second in zip(actual,expected))/3
        samples += 1
    results.append({"surface": name, "samples": samples, "black_samples": black, "expected_white": expected_white, "black_on_white": black_on_white, "mean_linear_color_error": error/samples, "uv": uv_map.name, "render_uvs": [layer.name for layer in obj.data.uv_layers if layer.active_render]})
print(json.dumps({"atlas":image.name,"surfaces":results},indent=2))
