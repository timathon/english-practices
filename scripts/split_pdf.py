import os
from pypdf import PdfReader, PdfWriter

def split_pdf(input_path, output_dir, pages_per_file=4):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created directory: {output_dir}")

    reader = PdfReader(input_path)
    total_pages = len(reader.pages)
    print(f"Total pages in {input_path}: {total_pages}")

    part_num = 1
    for start_idx in range(0, total_pages, pages_per_file):
        end_idx = min(start_idx + pages_per_file, total_pages)
        writer = PdfWriter()
        
        for i in range(start_idx, end_idx):
            writer.add_page(reader.pages[i])
            
        output_filename = f"NCE2-U_part_{part_num:02d}.pdf"
        output_path = os.path.join(output_dir, output_filename)
        
        with open(output_path, "wb") as out_f:
            writer.write(out_f)
            
        print(f"Saved: {output_path} (Pages {start_idx + 1} to {end_idx})")
        part_num += 1

if __name__ == "__main__":
    input_pdf = "temp/pdf/NCE2-U.pdf"
    output_folder = "temp/pdf/NCE2"
    split_pdf(input_pdf, output_folder, pages_per_file=4)
