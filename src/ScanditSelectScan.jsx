import React, { Component, createElement, createRef } from 'react';
import { AppState, BackHandler, Image } from 'react-native';
import {
  BarcodeSelection,
  BarcodeSelectionAimerSelection,
  BarcodeSelectionBasicOverlay,
  BarcodeSelectionSettings,
  Symbology,
} from 'scandit-react-native-datacapture-barcode';
import { Camera, DataCaptureContext, DataCaptureView, FrameSourceState } from 'scandit-react-native-datacapture-core';
import ViewShot from 'react-native-view-shot';

import { requestCameraPermissionsIfNeeded } from './camera-permission-handler';

// Enter your Scandit License key here.
// Your Scandit License key is available via your Scandit SDK web account.

const executeAction = action => {
  if (action && action.canExecute && !action.isExecuting) {
    action.execute();
  }
}

export default class ScanditSelectScan extends Component {
  state = {
    result: null,
    barcodes: []
  }

  constructor(props) {
    super(props);
    this.dataCaptureContext = DataCaptureContext.forLicenseKey(this.props.scanditLicenceKey);
    this.viewRef = createRef();
  }

  async componentDidMount() {
    this.handleAppStateChangeSubscription = AppState.addEventListener('change', this.handleAppStateChange);

    this.startCamera();

    // The barcode selection process is configured through barcode selection settings
    // and are then applied to the barcode selection instance that manages barcode recognition.
    this.barcodeSelectionSettings = new BarcodeSelectionSettings();

    // The settings instance initially has all types of barcodes (symbologies) disabled. For the purpose of this
    // sample we enable a very generous set of symbologies. In your own app ensure that you only enable the
    // symbologies that your app requires as every additional enabled symbology has an impact on processing times.
    this.barcodeSelectionSettings.enableSymbologies([
      Symbology.EAN13UPCA,
      Symbology.EAN8,
      Symbology.UPCE,
      Symbology.QR,
      Symbology.DataMatrix,
      Symbology.Code39,
      Symbology.Code128,
      Symbology.ArUco,
      Symbology.Code11,
      Symbology.Code25,
      Symbology.Code32,
      Symbology.Code39,
      Symbology.Code93,
      Symbology.Upu4State,
    ]);

    // Create new barcode selection mode with the settings from above.
    this.barcodeSelection = BarcodeSelection.forContext(this.dataCaptureContext, this.barcodeSelectionSettings);
    this.overlay = BarcodeSelectionBasicOverlay.withBarcodeSelectionForView(this.barcodeSelection, this.viewRef.current);

    // Register a listener to get informed whenever a new barcode got recognized.
    this.barcodeSelection.addListener({
      didUpdateSelection: async (_, session, frame) => {
        
        console.warn("A");
        const barcode1 = session.newlySelectedBarcodes[0];
        console.warn("B");
        if (!barcode1) { return }
        console.warn("C");
        if (!this.state.barcodes.includes(barcode1.data)) {
          this.setState(prevState => ({
            barcodes: [...prevState.barcodes, barcode1.data]
          }));
        }
        else { return }
        console.warn("D");
        this.viewRef.current?.removeOverlay(this.overlay);
        console.warn("E");
        ViewShot.captureRef(this.viewRef, {
          format: "jpg",
          quality: this.props.compressionPercentage.value,
        })
        .then(uri => {
          console.warn("1");
          this.viewRef.current.addOverlay(this.overlay);
          console.warn("2");
          Image.getSize(uri, (width, height) => {
            console.warn("3");
            console.warn('Image size:', width, height);
            console.warn("4");
            this.props.width.setValue(width.toString());
            console.warn("5");
            this.props.height.setValue(height.toString());
            console.warn("6");
            this.props.image.setValue(uri);
            console.warn("7");
          }, error => {
            console.error("Failed to get image size:", error);
          });
        })
        .catch(error => {
          console.error("Failed to capture view:", error);
        });

        this.props.barcode.setValue(barcode1.data.toString());
        console.warn('Widget finished: ' + barcode1.data);
        executeAction(this.props.onDetect);
      }
    });

    // Add a barcode selection overlay to the data capture view to render the location of captured barcodes on top of
    // the video preview. This is optional, but recommended for better visual feedback.

    this.barcodeSelectionSettings.selectionType = BarcodeSelectionAimerSelection.aimerSelection;
    this.barcodeSelectionSettings.selectionType.selectionStrategy.type = "autoSelectionStrategy";
    this.barcodeSelection.applySettings(this.barcodeSelectionSettings);
  }

  componentWillUnmount() {
    this.handleAppStateChangeSubscription.remove();
    this.dataCaptureContext.dispose();
  }

  handleAppStateChange = async (nextAppState) => {
    if (nextAppState.match(/inactive|background/)) {
      this.stopCamera();
    } else {
      this.startCamera();
    }
  }

  stopCamera() {
    if (this.camera) {
      this.camera.switchToDesiredState(FrameSourceState.Off);
    }
  }

  startCamera() {
    if (!this.camera) {
      this.camera = Camera.withSettings(BarcodeSelection.recommendedCameraSettings);
      this.dataCaptureContext.setFrameSource(this.camera);
    }

    requestCameraPermissionsIfNeeded()
      .then(() => this.camera.switchToDesiredState(FrameSourceState.On))
      .catch(() => BackHandler.exitApp());
  }

  componentDidUpdate(_, previousState) {
  }

  render() {
    return (
      <>
        <DataCaptureView style={{ flex: 1 }} context={this.dataCaptureContext} ref={this.viewRef}>
        </DataCaptureView>
      </>
    );
  };
}
export { ScanditSelectScan };