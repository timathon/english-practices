0. check the html folder and run release_gen on missing html(s) with builtin validation type, 10 users, 3 months validity and tts for missing audio only
1. run rm_release_gen.cjs [input_json] [output_html]
2. run vg_release_gen-3.cjs [input_json] [output_html]
3. run vm_release_gen-3.cjs [input_json] [type] [output_html] (interactive for 10 users, 3 months)
4. run sh_release_gen-3.cjs [input_json] [type] [output_html] (interactive for 10 users, 3 months)
5. run sa_release_gen-3.cjs [input_json] [type] [output_html] (interactive for 10 users, 3 months)
6. run wm_release_gen-3.cjs [input_json] [output_html] (process 1 file at a time, missing audio)
7. run update_index.cjs

Note: CLI defaults to 3 users and 3 months. Use Interactive Mode (run without arguments) for 10 users/3 months.
