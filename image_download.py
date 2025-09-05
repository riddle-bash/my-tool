import requests
import os
from urllib.parse import unquote

# Paste your string of URLs (each URL on a new line)
raw_urls = """
https://demo.tienganhk12.com/Upload/Exam/637674998278681272_Add%20a%20heading.png
https://demo.tienganhk12.com/Upload/Exam/637986799736209776_TiengAnhK12%20Exam%20Icons%20(2).png
https://demo.tienganhk12.com/Upload/Exam/637770584998844132_4.png
https://demo.tienganhk12.com/Upload/Exam/637147895003993825_Artboard%20Copy%207.png
https://demo.tienganhk12.com/Upload/Exam/637147894903713266_Artboard%20Copy%208.png
https://demo.tienganhk12.com/Upload/Exam/637147895108269068_Artboard%20Copy%206.png
https://demo.tienganhk12.com/Upload/Exam/637147894118183167_Artboard%20Copy%205.png
https://demo.tienganhk12.com/Upload/Exam/638086021834599721_IELTS%20Foundation.png
https://demo.tienganhk12.com/Upload/Exam/638086021615522655_IELTS%20Test%20Prep.png
https://demo.tienganhk12.com/Upload/Exam/637401708873234345_2.png
https://demo.tienganhk12.com/Upload/Exam/638086022068787297_Anh%20chuyen%20thi%20v%C3%A0o%2010.png
https://demo.tienganhk12.com/Upload/Exam/638748850563247175_638086022068787297_Anh%20chuyen%20thi%20v%C3%A0o%2010.png
https://demo.tienganhk12.com/Upload/Exam/638086022867225650_TA%20thi%20vao%2010.png
https://demo.tienganhk12.com/Upload/Exam/638748850727017290_638086022867225650_TA%20thi%20vao%2010.png
https://demo.tienganhk12.com/Upload/Exam/638086022611425787_De%20NTT%20thi%20v%C3%A0o%2010.png
https://demo.tienganhk12.com/Upload/Exam/638086023117627783_Toan%20thi%20vao%2010.png
https://demo.tienganhk12.com/Upload/Exam/638005584025466334_Artboard%20Copy%2050.png
https://demo.tienganhk12.com/Upload/Exam/638005583487217239_Artboard%20Copy%2042.png
https://demo.tienganhk12.com/Upload/Exam/638872485534395875_6%20T%E1%BB%95ng%20%C3%B4n%20Ti%E1%BA%BFng%20Anh.png
https://demo.tienganhk12.com/Upload/Exam/638872485773585647_6%20T%E1%BB%95ng%20%C3%B4n%20To%C3%A1n.png
https://demo.tienganhk12.com/Upload/Exam/637674981186893115_grammar.png
https://demo.tienganhk12.com/Upload/Exam/637770584813846949_3.png
https://demo.tienganhk12.com/Upload/Exam/638070467192619059_exam%20icon%20t%E1%BB%B1%20h%E1%BB%8Dc%20n%C3%A2ng%20cao%20(1).png
https://demo.tienganhk12.com/Upload/Exam/637147894788564218_Artboard%20Copy%2010.png
https://demo.tienganhk12.com/Upload/Exam/637147894681115912_Artboard%20Copy%209.png
https://demo.tienganhk12.com/Upload/Exam/638872486295844578_6%20C%E1%BA%A7u%20Gi%E1%BA%A5y.png
https://demo.tienganhk12.com/Upload/Exam/637401709632065350_6.png
https://demo.tienganhk12.com/Upload/Exam/637969566899538387_Exam%20Icons%20(22).png
https://demo.tienganhk12.com/Upload/Exam/637401709939217191_5.png
https://demo.tienganhk12.com/Upload/Exam/638258710461454786_V%C3%A0o%206%20L%C3%AA%20L%E1%BB%A3i.png
https://demo.tienganhk12.com/Upload/Exam/638872487351130244_6%20UMS.png
https://demo.tienganhk12.com/Upload/Exam/637401705475662586_1.png
https://demo.tienganhk12.com/Upload/Exam/638748850910299121_638086022867225650_TA%20thi%20vao%2010.png
https://demo.tienganhk12.com/Upload/Exam/638733325127392713_V%C3%A0o%2010%20To%C3%A1n.png
https://demo.tienganhk12.com/Upload/Exam/638733329369001238_V%C3%A0o%2010%20To%C3%A1n.png
https://demo.tienganhk12.com/Upload/Exam/637986796861455722_Exam%20Icons%20(23).png
https://demo.tienganhk12.com/Upload/Exam/637986798332838829_TiengAnhK12%20Exam%20Icons.png
https://demo.tienganhk12.com/Upload/Exam/637986799353851232_TiengAnhK12%20Exam%20Icons%20(1).png
https://demo.tienganhk12.com/Upload/Exam/637986800650072262_TiengAnhK12%20Exam%20Icons%20(3).png
https://demo.tienganhk12.com/Upload/Exam/637986800963781872_TiengAnhK12%20Exam%20Icons%20(4).png
https://demo.tienganhk12.com/Upload/Exam/637377746300303762_ThiDGNL.png
https://demo.tienganhk12.com/Upload/Exam/638188058933386464_Tieng%20Anh%2010.png
https://demo.tienganhk12.com/Upload/Exam/638476439527414898_Tieng%20Anh%2010.png
https://demo.tienganhk12.com/Upload/Exam/638241717874798810_Artboard%20Copy%2048.png
https://demo.tienganhk12.com/Upload/Exam/638647554971967209_Tieng%20Anh%2011.png
https://demo.tienganhk12.com/Upload/Exam/638579460576619707_Artboard%20Copy%2049.png
https://demo.tienganhk12.com/Upload/Exam/638188057592872687_Tieng%20Anh%203.png
https://demo.tienganhk12.com/Upload/Exam/638476438778387150_Tieng%20Anh%203.png
https://demo.tienganhk12.com/Upload/Exam/638241717668780702_Artboard%20Copy%2051.png
https://demo.tienganhk12.com/Upload/Exam/638476446484348242_Tieng%20Anh%204.png
https://demo.tienganhk12.com/Upload/Exam/638573274020809176_Tieng%20Anh%205.png
https://demo.tienganhk12.com/Upload/Exam/638188058430849069_Tieng%20Anh%206.png
https://demo.tienganhk12.com/Upload/Exam/638476439137351359_Tieng%20Anh%206.png
https://demo.tienganhk12.com/Upload/Exam/638241716226107798_Artboard%20Copy%2045.png
https://demo.tienganhk12.com/Upload/Exam/638647554721918571_Tieng%20Anh%207.png
https://demo.tienganhk12.com/Upload/Exam/638004745457084686_Artboard%20Copy%2040.png
https://demo.tienganhk12.com/Upload/Exam/638476439348416488_Tieng%20Anh%208.png
https://demo.tienganhk12.com/Upload/Exam/638004745742658144_Artboard%20Copy%2046.png
https://demo.tienganhk12.com/Upload/Exam/637377746156517166_ThiTHPT.png
https://demo.tienganhk12.com/Upload/Exam/638579374979116697_Artboard%20Copy%2034.png
https://demo.tienganhk12.com/Upload/Exam/638258216998494266_Toan%2010.png
https://demo.tienganhk12.com/Upload/Exam/638579379030023668_Artboard%20Copy%2037.png
https://demo.tienganhk12.com/Upload/Exam/638258217152684269_Toan%2011.png
https://demo.tienganhk12.com/Upload/Exam/638733273663316765_Toan%2012.png
https://demo.tienganhk12.com/Upload/Exam/638684897408398373_Toan%2012.png
https://demo.tienganhk12.com/Upload/Exam/638579374519213686_Artboard%20Copy%2056.png
https://demo.tienganhk12.com/Upload/Exam/638258216808768702_Toan%202.png
https://demo.tienganhk12.com/Upload/Exam/638733274670165600_Toan%203.png
https://demo.tienganhk12.com/Upload/Exam/638005584231073850_Artboard%20Copy%2053.png
https://demo.tienganhk12.com/Upload/Exam/638579374714369734_Artboard%20Copy%2050.png
https://demo.tienganhk12.com/Upload/Exam/638733275778671018_Toan%205.png
https://demo.tienganhk12.com/Upload/Exam/638733276254675945_Toan%206.png
https://demo.tienganhk12.com/Upload/Exam/638125649627911032_Toan%206.png
https://demo.tienganhk12.com/Upload/Exam/638733278205399454_Toan%207.png
https://demo.tienganhk12.com/Upload/Exam/638125649932641100_Toan%207.png
https://demo.tienganhk12.com/Upload/Exam/638125650103010017_Toan%208.png
https://demo.tienganhk12.com/Upload/Exam/638684897031732944_Toan%209.png
https://demo.tienganhk12.com/Upload/Exam/638573274195154767_Toan%209%20(1).png
https://demo.tienganhk12.com/Upload/Exam/637147895799585531_Artboard%20Copy%2018.png
https://demo.tienganhk12.com/Upload/Exam/637147894566788697_Artboard%20Copy%2023.png
https://demo.tienganhk12.com/Upload/Exam/637147895575078390_Artboard%20Copy%2016.png
https://demo.tienganhk12.com/Upload/Exam/638872485986028073_6%20T%E1%BB%95ng%20%C3%B4n%20TV.png
"""  # <-- paste here

raw_urls_2 = """https://demo.tienganhk12.com/Upload/Quiz/banners/%C4%90%C4%83ng%20k%C3%BD%20l%C3%A0m%20%C4%90S.png
https://demo.tienganhk12.com/Upload/Quiz/banners/Nang%20cao%20Tieng%20Anh.png
https://demo.tienganhk12.com/Upload/Quiz/banners/On%20thi%20vao%206.png
https://demo.tienganhk12.com/Upload/Quiz/banners/On%20thi%20vao%2010.png
https://demo.tienganhk12.com/Upload/Quiz/banners/On%20thi%20vao%20DH.png
https://demo.tienganhk12.com/Upload/Quiz/banners/Hoc%20tot%20Toan,%20TA.png
https://demo.tienganhk12.com/Upload/Quiz/banners/Contuhoc.com.png
https://demo.tienganhk12.com/Upload/Quiz/banners/azVocab%20tagline%20(1).png
https://demo.tienganhk12.com/Upload/Quiz/banners/Thi%20th%E1%BB%AD%20v%C3%A0o%2010%20HN%20banner%20sidebar.png
https://demo.tienganhk12.com/Upload/Quiz/Ban%20c%E1%BB%91%20v%E1%BA%A5n/C%C3%B4%20M%E1%BB%99c%20Lan%20(vu%C3%B4ng).png
https://demo.tienganhk12.com/Upload/templates/CoPhuongAnh.png
https://demo.tienganhk12.com/Upload/templates/CoNganHa.png
https://demo.tienganhk12.com/Upload/DownloadImages/1339637838004349293849.jpg"""

# Split the string into individual URLs, stripping empty lines
image_urls = [line.strip() for line in raw_urls_2.strip().splitlines() if line.strip()]

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
