import os
from pypdf import PdfReader, PdfWriter

def split_pdf(input_path, output_dir, pages_per_file=2, max_units=145):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created directory: {output_dir}")

    reader = PdfReader(input_path)
    total_pages = len(reader.pages)
    print(f"Total pages in {input_path}: {total_pages}")

    for part_num in range(1, max_units + 1):
        start_idx = (part_num - 1) * pages_per_file
        end_idx = start_idx + pages_per_file
        if start_idx >= total_pages:
            print(f"Reached end of document before reaching unit {part_num}")
            break
        
        end_idx = min(end_idx, total_pages)
        writer = PdfWriter()
        
        for i in range(start_idx, end_idx):
            writer.add_page(reader.pages[i])
            
        output_filename = f"c-giu-{part_num}.pdf"
        output_path = os.path.join(output_dir, output_filename)
        
        with open(output_path, "wb") as out_f:
            writer.write(out_f)
            
        print(f"Saved: {output_path} (Pages {start_idx + 1} to {end_idx})")

if __name__ == "__main__":
    input_pdf = "temp/pdf/giu/GIU.pdf"
    output_folder = "temp/pdf/giu"
    split_pdf(input_pdf, output_folder, pages_per_file=2, max_units=145)
