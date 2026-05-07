0. check the html folder and run release_gen on missing html(s) with builtin validation type, 10 users, 3 months validity and tts for missing audio only
1. run rm_release_gen.cjs [input_json] [output_html]
2. run vg_release_gen-3.cjs [input_json] [output_html]
3. run vm_release_gen-3.cjs [input_json] [type] [output_html] (interactive for 10 users, 3 months)
4. run sh_release_gen-3.cjs [input_json] [type] [output_html] (interactive for 10 users, 3 months)
5. run sa_release_gen-3.cjs [input_json] [type] [output_html] (interactive for 10 users, 3 months)
6. run wm_release_gen-3.cjs [input_json] [output_html] (process 1 file at a time, missing audio)
7. run update_index.cjs

Note: CLI defaults to 3 users and 3 months. Use Interactive Mode (run without arguments) for 10 users/3 months.

### **Navigation & Directory Standards**
- **Folder Structure:** Always organize exercises into `[book]/[unit]/[page-range]/` subdirectories (e.g., `B-Think1/b-think1-u12/b-think1-u12-p110-p113/`).
- **Home Links:** All generated HTML exercises in nested subdirectories MUST point their "home" (🏠) link to the textbook-specific `index.html`. 
  - For `unit/page-range/` depth, use `href="../../index.html"`.
  - Always verify that the linked `index.html` exists in the target directory.
