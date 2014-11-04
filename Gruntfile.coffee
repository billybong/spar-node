module.exports = (grunt) ->
  grunt.initConfig
    pkg: grunt.file.readJSON 'package.json'

    copy:
      files:
        cwd: 'src/',         # set working folder / root to copy
        src: '**/*',            # copy all files and subfolders
        dest: 'dist/',   # destination folder
        expand: true            # required when using cwd

    clean: ['dist']

  grunt.loadNpmTasks 'grunt-contrib-clean'
  grunt.loadNpmTasks 'grunt-contrib-copy'

  grunt.registerTask 'build', ['clean', 'copy']
