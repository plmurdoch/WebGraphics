import sys
import re
import queue
import numpy 
import array

class image_info:
    def __init__(self):
        near = 0
        left = 0
        right = 0
        bottom = 0
        top = 0
        resolution = (0,0)
        back = (0.0,0.0,0.0)
        ambient = (0.0,0.0,0.0)
        output = ""

class sphere:
    def __init__(self, name, x, y, z, scl_x, scl_y, scl_z, r, g, b, k_a, k_d, k_s, k_r, n):
        name = name
        posX = x
        posY = y
        posZ = z
        sclX = scl_x
        sclY = scl_y
        sclZ = scl_z
        red = r
        green = g
        KA = k_a
        KD = k_d
        KS = k_s
        KR = k_r
        N = n

class light:
    def __init__(self, name, x, y, z, l_r, l_g, l_b):
        name = name
        posX = x
        posY = y
        posZ = z
        red = l_r
        green = l_g
        blue = l_b

def initializer(input_file):
    spheres = []
    lights = []
    info = image_info()
    file = open(input_file, "r")
    for lines in file:
        parse_lines(lines, info, spheres, lights)
    file.close()
    scene_builder(info, spheres, lights)



def scene_builder(info, s_list, l_list):
    scrn = (info.left, info.right, info.top, info.bottom)
    output = open(info.output,"wb")
    initial = "P6\n"+str(info.resolution[0])+" "+str(info.resolution[1])+" 255\n"
    output.write(initial.encode())
    background = array.array('B',[info.back[0]*255,info.back[1]*255,info.back[2]*255]*info.resolution[0]*info.resolution[1])
    background.tofile(output)
    for x in range(info.resolution[0]):
        for y in range(info.resolution[1]):
            draw(x, y, info, s_list, l_list, output)
    output.close()


def draw(x,y, info, s, l, out):
    return
    
    
    
def parse_lines(lines, information, spheres, lights):
    buf = []
    if re.search("NEAR", lines):
        buf = lines.split()
        information.near = float(buf[1])
    elif re.search("LEFT", lines):
        buf = lines.split()
        information.left = float(buf[1])
    elif re.search("RIGHT",lines):
        buf = lines.split()
        information.right = float(buf[1])
    elif re.search("BOTTOM", lines):
        buf = lines.split()
        information.bottom = float(buf[1])
    elif re.search("TOP", lines):
        buf = lines.split()
        information.top = float(buf[1])
    elif re.search("RES", lines):
        buf = lines.split()
        information.resolution = (int(buf[1]), int(buf[2]))
    elif re.search("BACK", lines):
        buf = lines.split()
        information.back =  information.near = (float(buf[1]), float(buf[2]), float(buf[3]))
    elif re.search("AMBIENT", lines):
        buf = lines.split()
        information.ambient = (float(buf[1]),float(buf[2]), float(buf[3]))
    elif re.search("OUTPUT", lines):
        buf = lines.split()
        information.output = buf[1]
    else:
        if re.search("SPHERE", lines):
            spheres.append(initialize_sphere(lines))
        else:
            lights.append(initialize_light(lines))


def initialize_sphere(lines):
    parsed = lines.split()
    new_sphere = sphere(parsed[1], float(parsed[2]), float(parsed[3]),float(parsed[4]),
                        float(parsed[5]), float(parsed[6]), float(parsed[7]),
                        float(parsed[8]), float(parsed[9]), float(parsed[10]), 
                        float(parsed[11]), float(parsed[12]), float(parsed[13]), 
                        float(parsed[14]), int(parsed[15]))
    return new_sphere
    
def initialize_light(lines):    
    parsed = lines.split()
    new_light = light(parsed[1], float(parsed[2]), float(parsed[3]),float(parsed[4]),
                        float(parsed[5]), float(parsed[6]), float(parsed[7]))
    return new_light
    
def main():
    if len(sys.argv) < 2:
        print("Use proper syntax:",sys.argv[0]," input_text_file")
        sys.exit(1)
    input_file_name = sys.argv[1]
    initializer(input_file_name)

if __name__ == "__main__":
    main()
