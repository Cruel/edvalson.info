module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    compass: {
      dist: {
        options: {
          importPath: [
	          'bower_components/foundation/scss',
	          'bower_components/foundation-icon-fonts'
          ],
          config: 'config.rb',
          outputStyle: 'compressed',
          sassDir: 'scss',
          cssDir: 'css',
          environment: 'production'
        }
      }
    },

    watch: {
      grunt: {
      	files: ['Gruntfile.js'],
      	tasks: ['build']
      },

      sass: {
        files: 'scss/**/*.scss',
        tasks: ['compass']
      },
      usemin: {
        files: ['js/**/*.js', '!js/app.min.js', 'index.html'],
        tasks: ['copy','useminPrepare','concat','uglify','usemin','jekyll:build']
      }
    },

    copy: {
      includes: {
        src: '_includes/footer_build.html',
        dest: '_includes/footer.html',
      }
    },

    useminPrepare: {
      html: '_includes/footer_build.html',
      options: {
        dest: '.'
      }
    },
    usemin: {
      html: '_includes/footer.html'
    },
    
    jekyll: {
      build:{
        options: {
          serve: false
        }
      },
      serve:{
        options: {
          serve: true
        }
      }
    },
    
    concurrent: {
        jekyllwatch: {
            tasks: ['jekyll:serve', 'watch'],
            options: {
                logConcurrentOutput: true
            }
        }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-compass');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-usemin');
  grunt.loadNpmTasks('grunt-jekyll');
  grunt.loadNpmTasks('grunt-concurrent');

  grunt.registerTask('build', ['compass','copy','useminPrepare','concat','uglify','usemin','jekyll:build']);
  grunt.registerTask('default', ['build','concurrent:jekyllwatch']);
};
