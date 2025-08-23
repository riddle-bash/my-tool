import os
import re
import xml.etree.ElementTree as ET
from googletrans import Translator

translator = Translator()

def is_vietnamese(text: str) -> bool:
    """Detect if text contains Vietnamese diacritics."""
    return bool(re.search(r"[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễ"
                          r"ìíịỉĩòóọỏõôồốộổỗơờớợởỡ"
                          r"ùúụủũưừứựửữỳýỵỷỹđ]", text.lower()))

def translate(text: str, target_lang: str) -> str:
    """Translate text into target language using Google Translate."""
    if not text.strip():
        return ""  # skip empty
    try:
        return translator.translate(text, dest=target_lang).text
    except Exception as e:
        print(f"⚠️ Translation failed for '{text}': {e}")
        return text  # fallback to original

def process_resources(input_file: str = "in/QuizSystem.xml", output_dir: str = "out/"):
    tree = ET.parse(input_file)
    root = tree.getroot()

    vi_root = ET.Element("resources")
    en_root = ET.Element("resources")

    # Handle both: <text name="..." value="..."/> and <text name="...">...</text>
    for text_node in root.findall(".//text"):
        name = text_node.attrib.get("name")
        value = text_node.attrib.get("value", "") or (text_node.text.strip() if text_node.text else "")

        # Skip empty locales
        if not value:
            continue

        vi_node = ET.Element("text", name=name)
        en_node = ET.Element("text", name=name)

        if is_vietnamese(value):
            vi_node.text = value
            en_node.text = translate(value, "en")
        else:
            en_node.text = value
            vi_node.text = translate(value, "vi")

        vi_root.append(vi_node)
        en_root.append(en_node)

    os.makedirs(output_dir, exist_ok=True)

    vi_tree = ET.ElementTree(vi_root)
    vi_tree.write(os.path.join(output_dir, "vi_resource.xml"), encoding="utf-8", xml_declaration=True)

    en_tree = ET.ElementTree(en_root)
    en_tree.write(os.path.join(output_dir, "en_resource.xml"), encoding="utf-8", xml_declaration=True)

    print("✅ Resources created in:", output_dir)

if __name__ == "__main__":
    process_resources()
