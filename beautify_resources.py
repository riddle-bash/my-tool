import xml.etree.ElementTree as ET

def clean_input(path: str) -> str:
    """Read XML file, remove BOM/leading whitespace, return as string."""
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    return content.lstrip("\ufeff \n\r\t")

def beautify_xml(input_file: str, output_file: str):
    xml_string = clean_input(input_file)

    # Parse from string to avoid BOM issue
    root = ET.fromstring(xml_string)

    def indent(elem, level=0):
        i = "\n" + level * "  "
        if len(elem):
            if not elem.text or not elem.text.strip():
                elem.text = i + "  "
            for child in elem:
                indent(child, level + 1)
            if not child.tail or not child.tail.strip():
                child.tail = i
        if level and (not elem.tail or not elem.tail.strip()):
            elem.tail = i

    indent(root)
    tree = ET.ElementTree(root)
    tree.write(output_file, encoding="utf-8", xml_declaration=True)
    print(f"✅ Beautified XML saved to {output_file}")

if __name__ == "__main__":
    beautify_xml("out/en_resource.xml", "out/en_resource_pretty.xml")
    beautify_xml("out/vi_resource.xml", "out/vi_resource_pretty.xml")
