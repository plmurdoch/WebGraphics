import sys
import re
import queue
import numpy 
import array
import matplotlib.pyplot

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
    #output = open(info.output,"wb")
    #initial = "P6\n"+str(info.resolution[0])+" "+str(info.resolution[1])+"\n255\n"
   # output.write(initial.encode())
   # output.write(b'\n')
    background = numpy.zeros((info.resolution[1],info.resolution[0],3))
    eye_ray(background, cam, scrn, info, s_list, l_list)
    to_file = background.tolist()
    #background.tofile(output)
    matplotlib.pyplot.imsave(info.output, background)
    #output.close()


def eye_ray(background, cam, scrn, info, s, l):
    count_y = scrn[2]
    increment_y = float((scrn[2]-scrn[3])/info.resolution[1])
    increment_x = float((scrn[0] -scrn[1])/info.resolution[0])
    true_y = 0
    while count_y > scrn[3]: 
        count_x = scrn[0]
        true_x = 0
        counter = 0 
        while count_x < scrn[1]:
            pix_loc = numpy.array([count_x,count_y,0])
            direction = ((pix_loc - cam)/numpy.linalg.norm((pix_loc - cam)))
            color = rayTrace(cam, s, l, direction, info, 0)
            background[true_y, true_x] = numpy.array([color[0],color[1], color[2]])
            count_x -= increment_x
            true_x += 1
            if true_x == info.resolution[0]:
                true_x -=1
        count_y -= increment_y
        true_y += 1
        if true_y == info.resolution[1]:
                true_y -=1
    return
    

def rayTrace(cam, objects, lighting, direction, info, bounce):
    bounce+=1
    if bounce > 3:
        return
    closest_intersect = ("", 0.0)
    for s_intersect in objects:
        is_hit = hit_or_miss(s_intersect.center, s_intersect.scale,direction, cam)
        if is_hit:
            if is_hit < 1:
                continue
            else:
                if closest_intersect[1] == 0.0:
                    temp = list(closest_intersect)
                    temp[0] = s_intersect.name
                    temp[1] = is_hit
                    closest_intersect = tuple(temp)
                elif closest_intersect[1] > is_hit:
                    temp = list(closest_intersect)
                    temp[0] = s_intersect.name
                    temp[1] = is_hit
                    closest_intersect = tuple(temp)
    if closest_intersect[0] != "":
        for search in objects:
            if search.name == closest_intersect[0]:
                intersection = (cam +(direction*closest_intersect[1]))
                c_local = numpy.array([0.0,0.0,0.0])
                reflect_c = numpy.array([0.0,0.0,0.0])
                reflect_list = []
                for li in lighting:
                    temp = calc_shadow(li, intersection, objects, search, direction, reflect_list, closest_intersect[1], cam)
                    c_local = temp +c_local
                for i in reflect_list:
                    bouncing = 0
                    #reflect_c = rayTrace(intersection, objects, lighting, i, info, bouncing)
                color_r = search.KA*info.ambient[0]*search.color[0] + c_local[0]+search.KR*reflect_c[0]
                color_g = search.KA*info.ambient[1]*search.color[1] + c_local[1]+search.KR*reflect_c[1]
                color_b = search.KA*info.ambient[2]*search.color[2] + c_local[2]+search.KR*reflect_c[2]
                color = numpy.array([color_r,color_g,color_b])
                return numpy.clip(color, 0.0,1.0, out=color)
    else:
        return info.back

  
def calc_shadow(li, intersection, objects,sname, direction, reflect_list, t, cam_loc):
    direct = ((intersection- sname.center)/numpy.linalg.norm((intersection -sname.center)))
    L = (li.position - intersection)/numpy.linalg.norm(li.position-intersection)
    for c in objects:
        if c.name != sname.name:
            hit = block_or_not(c.center, c.scale, L, li.position)
            if not hit:
                continue
            if hit:
                return numpy.array([0.0,0.0,0.0])
        else:
            continue
    calc_2 = (2*(numpy.dot(L,direct)*direct)) 
    R = (calc_2 -L)/numpy.linalg.norm(calc_2 - L)
    V = (cam_loc-intersection)/numpy.linalg.norm(cam_loc -intersection)
    local_r = sname.KD*li.color[0]*(numpy.dot(L,direct))*sname.color[0]+sname.KS*li.color[0]*(pow(numpy.dot(R,V),sname.n))
    local_g = sname.KD*li.color[1]*(numpy.dot(L,direct))*sname.color[1]+sname.KS*li.color[1]*(pow(numpy.dot(R,V),sname.n))
    local_b = sname.KD*li.color[2]*(numpy.dot(L,direct))*sname.color[2]+sname.KS*li.color[2]*(pow(numpy.dot(V,R),sname.n))
    return numpy.array([local_r,local_g,local_b])


def hit_or_miss(center, scale, direct, cam_loc):
    trans_2 = cam_loc -center
    calc_x_a = pow(direct[0]/scale[0],2)
    calc_y_a = pow(direct[1]/scale[1],2)
    calc_z_a = pow(direct[2]/scale[2],2)
    calc_x_b = (2*trans_2[0]*direct[0])/pow(scale[0],2)
    calc_y_b = (2*trans_2[1]*direct[1])/pow(scale[1],2)
    calc_z_b = (2*trans_2[2]*direct[2])/pow(scale[2],2)
    calc_x_c = pow(trans_2[0]/scale[0],2)
    calc_y_c = pow(trans_2[1]/scale[1],2)
    calc_z_c = pow(trans_2[2]/scale[2],2)
    A = calc_x_a +calc_y_a +calc_z_a
    B = calc_x_b +calc_y_b +calc_z_b
    C = calc_x_c +calc_y_c +calc_z_c -1
    hit = pow(B,2) - 4*A*C
    if hit > 0:
        root_1 = (-B - pow(hit,(1/2)))/2
        root_2 = (-B + pow(hit,(1/2)))/2
        return min(root_1, root_2)
    elif hit == 0.0:
        return (-B)/2
    else:
        return       

def block_or_not(center, scale, direct, cam_loc):
    trans_2 = cam_loc 
    calc_x_a = pow(direct[0]/scale[0],2)
    calc_y_a = pow(direct[1]/scale[1],2)
    calc_z_a = pow(direct[2]/scale[2],2)
    calc_x_b = (2*trans_2[0]*direct[0])/pow(scale[0],2)
    calc_y_b = (2*trans_2[1]*direct[1])/pow(scale[1],2)
    calc_z_b = (2*trans_2[2]*direct[2])/pow(scale[2],2)
    calc_x_c = pow(trans_2[0]/scale[0],2)
    calc_y_c = pow(trans_2[1]/scale[1],2)
    calc_z_c = pow(trans_2[2]/scale[2],2)
    A = calc_x_a +calc_y_a +calc_z_a
    B = calc_x_b +calc_y_b +calc_z_b
    C = calc_x_c +calc_y_c +calc_z_c -1
    hit = pow(B,2) - 4*A*C
    if hit > 0:
        return 1
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
        elif re.search("LIGHT",lines):
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
