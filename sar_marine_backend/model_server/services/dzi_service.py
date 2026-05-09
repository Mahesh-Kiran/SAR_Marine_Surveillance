import pyvips

def generate_dzi(input_path, output_prefix, tile_size=256):
    image = pyvips.Image.new_from_file(str(input_path), access='sequential')
    image.dzsave(str(output_prefix), tile_size=tile_size)
