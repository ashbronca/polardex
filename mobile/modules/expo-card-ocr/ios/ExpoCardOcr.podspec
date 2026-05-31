Pod::Spec.new do |s|
  s.name           = 'ExpoCardOcr'
  s.version        = '1.0.0'
  s.summary        = 'On-device Pokémon card text recognition via Apple Vision'
  s.description    = 'Reads card name + set number off a still image, fully on-device.'
  s.author         = 'Polardex'
  s.homepage       = 'https://polardex.app'
  s.license        = 'MIT'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
