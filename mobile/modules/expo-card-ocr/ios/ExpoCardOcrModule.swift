import ExpoModulesCore
import Vision
import UIKit

/// On-device OCR for Pokémon cards using Apple's Vision framework.
/// Returns one entry per recognised line with its text, confidence, and a
/// normalised bounding box (top-left origin) so JS can pick the card name as
/// the largest block and read the set number from the corner.
public class ExpoCardOcrModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoCardOcr")

    AsyncFunction("recognize") { (uri: String, promise: Promise) in
      guard let url = URL(string: uri) else {
        promise.reject("ERR_URI", "Invalid image URI")
        return
      }
      guard
        let data = try? Data(contentsOf: url),
        let image = UIImage(data: data),
        let cgImage = image.cgImage
      else {
        promise.reject("ERR_IMAGE", "Could not load image at \(uri)")
        return
      }

      let request = VNRecognizeTextRequest { request, error in
        if let error = error {
          promise.reject("ERR_OCR", error.localizedDescription)
          return
        }
        let observations = (request.results as? [VNRecognizedTextObservation]) ?? []
        let lines: [[String: Any]] = observations.compactMap { obs in
          guard let candidate = obs.topCandidates(1).first else { return nil }
          let box = obs.boundingBox // normalised, bottom-left origin
          return [
            "text": candidate.string,
            "confidence": candidate.confidence,
            "x": box.minX,
            "y": 1.0 - box.maxY, // flip to top-left origin
            "width": box.width,
            "height": box.height,
          ]
        }
        promise.resolve(lines)
      }

      request.recognitionLevel = .accurate
      request.usesLanguageCorrection = false

      // Respect the photo's EXIF orientation so text is read upright even when
      // the capture buffer is rotated relative to how it displays.
      let orientation = Self.cgOrientation(from: image.imageOrientation)
      let handler = VNImageRequestHandler(cgImage: cgImage, orientation: orientation, options: [:])
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          try handler.perform([request])
        } catch {
          promise.reject("ERR_PERFORM", error.localizedDescription)
        }
      }
    }
  }

  private static func cgOrientation(from orientation: UIImage.Orientation) -> CGImagePropertyOrientation {
    switch orientation {
    case .up: return .up
    case .upMirrored: return .upMirrored
    case .down: return .down
    case .downMirrored: return .downMirrored
    case .left: return .left
    case .leftMirrored: return .leftMirrored
    case .right: return .right
    case .rightMirrored: return .rightMirrored
    @unknown default: return .up
    }
  }
}
