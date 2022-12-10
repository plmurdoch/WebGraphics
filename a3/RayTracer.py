import sys
import re
import queue
import numpy 

class image_info:
    def __init__(self):
        self.near = 0
        self.left = 0
        self.right = 0
        self.bottom = 0
        self.top = 0
        self.resolution = (0,0)
        self.back = (0.0,0.0,0.0)
        self.ambient = (0.0,0.0,0.0)
        self.output = ""

class sphere:
    def __init__(self, name, x, y, z, scl_x, scl_y, scl_z, r, g, b, k_a, k_d, k_s, k_r, n):
        self.name = name
        self.center = numpy.array([x,y,z])
        self.scale = numpy.array([scl_x,scl_y,scl_z])
        self.color = numpy.array([r,g,b])
        self.KA = k_a
        self.KD = k_d
        self.KS = k_s
        self.KR = k_r
        self.n = n


class light:
    def __init__(self, name, x, y, z, l_r, l_g, l_b):
        self.name = name
        self.position = numpy.array([x,y,z])
        self.color = numpy.array([l_r,l_g,l_b])

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
    cam = numpy.array([0,0,1])
    output = open(info.output,"wb")
    initial = "P6\n"+str(info.resolution[0])+" "+str(info.resolution[1])+" 255\n"
    background = numpy.zeros((info.resolution[1],info.resolution[0],3))
    eye_ray(background, cam, scrn, info, s_list, l_list)
    output.write(initial.encode())
    numpy.save(output, background)
    output.close()


def eye_ray(background, cam, scrn, info, s, l):
    count_y = scrn[2]
    increment_y = float((scrn[2]-scrn[3])/info.resolution[1])
    increment_x = float((scrn[0] -scrn[1])/info.resolution[0])
    true_y = 0
    while count_y >= scrn[3]: 
        count_x = scrn[0]
        true_x = 0
        while count_x <= scrn[1]:
            pix_loc = numpy.array([count_x,count_y,0])
            direction = ((pix_loc - cam)/numpy.linalg.norm((pix_loc - cam)))
            for s_intersect in s:
                is_hit = hit_or_miss(s_intersect.center, s_intersect.scale,direction, cam)
                if is_hit:
                    background[true_y,true_x] = numpy.array([s_intersect.color[0]*255,s_intersect.color[1]*255,
                                                             s_intersect.color[2]*255])
            count_x -= increment_x
            true_x += 1
        count_y -= increment_y
        true_y += 1
    return
    
    #need hit/miss calculator now
def hit_or_miss(center, scale, direct, cam_loc):
    calc_1 = 2 * numpy.dot(direct, cam_loc-center)
    calc_canon = pow(numpy.linalg.norm(cam_loc - center),2) - 1
    hit = pow(calc_1,2) - 4*calc_canon
    if hit > 0:
        root_1 = (-calc_1 - pow(hit,(1/2)))/2
        root_2 = (-calc_1 + pow(hit,(1/2)))/2
        return min(root_1, root_2)
    elif hit == 0:
        return (-calc_1)/2
    else:
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
