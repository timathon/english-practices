0. check the html folder and run release_gen on missing html(s) with 10 users and 3 months validity
1. run rm_release_gen.cjs [input_json] [output_html]
2. run vg_release_gen-3.cjs [input_json] [output_html] --regenerate
3. run vm_release_gen-3.cjs [input_json] [type] [output_html] tts for missing audio only
4. run sh_release_gen-3.cjs [input_json] [type] [output_html] --regenerate
5. run sa_release_gen-3.cjs [input_json] [type] [output_html] tts for missing audio only
6. run wm_release_gen-3.cjs [input_json] [output_html] tts for missing audio only, process 1 file at a time for text-navigator and writing-map
7. run update_index.cjs