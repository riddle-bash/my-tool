import requests
import os
from urllib.parse import unquote

# Paste your list of image filenames (each filename on a new line)
raw_filenames = """252973.jpg
252993.png
258234.png
259024.png
257268.png
257251.png
263089.jpg
266155.png
269543.jpg
269544.jpg
262614.png
266163.png
266174.png
266206.png
264417.png
264465.png
265636.png
265794.png
266621.png
266683.png
267048.png
267609.png
262126.png
262576.png
262577.png
262708.jpg
267018.png
263483.png
277041.png
277309.png
269545.jpg
266123.png
266236.png
287726.png
288078.png
290019.png
290186.png
290655.jpg
289238.jpg
289237.jpg
292973.png
292774.png
289239.jpg
289242.jpg
266228.png
289247.jpg
295832.png
274064.jpg
275134.jpg
297837.jpg
273990.jpg
275102.jpg
281540.jpg
281553.jpg
281570.jpg
281603.jpg
281612.jpg
281962.jpg
282018.jpg
282084.jpg
282085.jpg
282113.jpg
282115.jpg
282141.jpg
282169.jpg
282198.jpg
282221.jpg
282222.jpg
282279.jpg
282626.jpg
282431.jpg
282389.jpg
282361.jpg
282304.jpg
282294.jpg
282033.jpg
282641.jpg
300955.jpg
282266.jpg
282346.jpg
301023.jpg
301010.jpg
303399.jpg
303415.jpg
303441.jpg
297800.jpg
297816.jpg
303465.jpg
303454.jpg
303460.jpg
300981.jpg
301106.jpg
252528.png
252821.png
282352.png
282359.png
282360.png
313402.png
313616.png
313690.png
257274.png
315133.png
315138.png
304668.jpg
262073.jpg
304694.jpg
304708.jpg
316679.png
316680.png
316681.png
304718.jpg
318319.png
318321.png
318329.png
319027.jpg
318976.jpg
319061.jpg
306681.png
310175.png
306682.png
320449.jpg
320432.jpg
320410.jpg
321592.jpg
321397.jpg
321371.jpg
322395.png
322415.png
322731.jpg
322724.jpg
322508.jpg
306670.png
301125.png
310176.png
322366.png
322377.png
321638.png
329862.png
329871.png
301139.jpg
310178.png
322380.png
310179.png
257455.png
310180.png
331028.png
262778.jpg
315125.png
335064.jpg
364891.png
364914.png
290654.jpg
310181.png
341473.jpg
301146.jpg
310182.png
341497.jpg
310177.jpg
301072.jpg
715619.png
290617.jpg
297826.jpg
321634.png
253045.png
262575.png
261731.jpg
329861.png
262123.jpg
321671.png
257369.png"""

# Base URL prefix
base_url = "https://demo.tienganhk12.com/Upload/DragDropImage/"

# Split the string into individual filenames, stripping empty lines
filenames = [line.strip() for line in raw_filenames.strip().splitlines() if line.strip()]

# Create full URLs by adding the prefix
image_urls = [base_url + filename for filename in filenames]

# Folder to save images
output_folder = "downloaded_images"
os.makedirs(output_folder, exist_ok=True)

# Download each image
for url in image_urls:
    filename = url.split("/")[-1]
    # Decode URL-encoded characters in filename
    filename = unquote(filename)
    print(f"Downloading {url}...")

    try:
        response = requests.get(url)
        if response.status_code == 200:
            with open(os.path.join(output_folder, filename), "wb") as f:
                f.write(response.content)
            print(f"✅ Saved as {filename}")
        else:
            print(f"❌ Failed: {url} (Status {response.status_code})")
    except Exception as e:
        print(f"❌ Error: {url} -> {e}")

print(f"\nDownload complete! Images saved to '{output_folder}' folder.")
