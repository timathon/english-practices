import os
import time
import google.generativeai as genai

# Setup: pip install -U google-generativeai
# Set environment variable: export GOOGLE_API_KEY='your_api_key'

def harvest_pdf(pdf_path, output_path, instructions_path):
    # Initialize API
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("Error: GOOGLE_API_KEY environment variable not set.")
        return

    genai.configure(api_key=api_key)

    # Load instructions
    with open(instructions_path, 'r', encoding='utf-8') as f:
        instructions = f.read()

    print(f"Uploading {pdf_path}...")
    sample_file = genai.upload_file(path=pdf_path, display_name=os.path.basename(pdf_path))
    
    # Wait for the file to be processed
    while sample_file.state.name == "PROCESSING":
        print(".", end="", flush=True)
        time.sleep(2)
        sample_file = genai.get_file(sample_file.name)

    if sample_file.state.name == "FAILED":
        raise Exception(f"File processing failed: {sample_file.name}")

    print(f"\nProcessing {pdf_path} with Gemini...")
    
    model = genai.GenerativeModel(model_name="gemini-2.0-flash")
    
    # Generate content
    response = model.generate_content(
        [sample_file, instructions],
        generation_config={"temperature": 0.0} # Low temperature for high fidelity
    )

    # Save to file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(response.text)

    print(f"Successfully harvested to {output_path}")

    # Clean up file from Gemini server (optional)
    genai.delete_file(sample_file.name)

if __name__ == "__main__":
    pdf = "temp/pdf/A3B/A3B-New-U3.pdf"
    output = "data/A3B/a3b-u3.md"
    instructions = "temp/gems/0 Textbook Content Harvester"
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(output), exist_ok=True)
    
    harvest_pdf(pdf, output, instructions)
