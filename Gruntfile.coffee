module.exports = (grunt) ->
  grunt.initConfig
    pkg: grunt.file.readJSON 'package.json'
    coffee:
      coffee_to_js:
        options:
          bare: true
          sourceMap: true
        expand: true
        flatten: false
        cwd: "src"
        src: ["**/*.coffee"]
        dest: 'dist'
        ext: ".js"

    copy:
      files:
        cwd: 'sslcert',         # set working folder / root to copy
        src: '**/*',            # copy all files and subfolders
        dest: 'dist/sslcert',   # destination folder
        expand: true            # required when using cwd

    clean: ['dist']

  grunt.loadNpmTasks 'grunt-contrib-clean'
  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-copy'

  grunt.registerTask 'build', ['clean', 'coffee', 'copy']