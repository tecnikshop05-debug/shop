
import re
import os
import base64

html_path = '/Users/david/Documents/tecnik/cleanbrush-landing (1).html'
output_dir = '/Users/david/Documents/tecnik/public/images'

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

with open(html_path, 'r') as f:
    content = f.read()

# Tech Visual Image
tech_match = re.search(r'<div class="tech-visual">\s*<img src="data:image/webp;base64,([^"]+)"', content)
if tech_match:
    print("Found Tech Visual Image")
    data = tech_match.group(1)
    with open(os.path.join(output_dir, 'tech-visual.webp'), 'wb') as f:
        f.write(base64.b64decode(data))
else:
    print("Tech Visual Image NOT found")

# Transformation Images
transform_matches = re.findall(r'<div class="transform-img">\s*<img src="data:image/webp;base64,([^"]+)"', content)

if len(transform_matches) >= 1:
    print("Found Transformation Image 1")
    with open(os.path.join(output_dir, 'transform-1.webp'), 'wb') as f:
        f.write(base64.b64decode(transform_matches[0]))

if len(transform_matches) >= 2:
    print("Found Transformation Image 2")
    with open(os.path.join(output_dir, 'transform-2.webp'), 'wb') as f:
        f.write(base64.b64decode(transform_matches[1]))

# FB Review Images
# Use a more flexible regex
fb_matches = re.findall(r'class="fb-photo".*?src="data:image/webp;base64,([^"]+)"', content, re.DOTALL)

print(f"Found {len(fb_matches)} FB Review Images")

for i, data in enumerate(fb_matches):
    filename = f'review-{i+1}.webp'
    print(f"Saving {filename}...")
    with open(os.path.join(output_dir, filename), 'wb') as f:
        f.write(base64.b64decode(data))

print("Done extracting images.")
