module.exports = (grunt) ->
  grunt.initConfig
    coffee:
      compileJoined:
        options:
          join: true
        files:
          'js/application.js':
            [
              'js/*.coffee'
#             'otherdirectory/*.coffee'
            ]
    watch:
      files: 'js/*.coffee'
      tasks:
        [
          'coffee'
#         'other-task'
        ]

  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-watch'

  grunt.registerTask 'default', ['coffee']