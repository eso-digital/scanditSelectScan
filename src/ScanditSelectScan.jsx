import React, { Component, createElement, createRef } from 'react';
import { AppState, BackHandler, Image, SafeAreaView, TouchableWithoutFeedback, Text } from 'react-native';
import {
  BarcodeSelection,
  BarcodeSelectionAimerSelection,
  BarcodeSelectionBasicOverlay,
  BarcodeSelectionSettings,
  Symbology,
} from 'scandit-react-native-datacapture-barcode';
import { Camera, DataCaptureContext, DataCaptureView, FrameSourceState } from 'scandit-react-native-datacapture-core';
import ViewShot from 'react-native-view-shot';
import KeepAwake from 'react-native-keep-awake';

import { requestCameraPermissionsIfNeeded } from './camera-permission-handler';

const executeAction = action => {
  if (action && action.canExecute && !action.isExecuting) {
    action.execute();
  }
}

const SelectionStrategy = {
  auto: 'autoSelectionStrategy',
  manual: 'manualSelectionStrategy'
}

export default class ScanditSelectScan extends Component {
  state = {
    result: null,
    selectionStrategy: SelectionStrategy.auto
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

    this.barcodeSelectionSettings.codeDuplicateFilter = 10000;

    // Create new barcode selection mode with the settings from above.
    this.barcodeSelection = BarcodeSelection.forContext(this.dataCaptureContext, this.barcodeSelectionSettings);
    this.overlay = BarcodeSelectionBasicOverlay.withBarcodeSelectionForView(this.barcodeSelection, this.viewRef.current);

    this.viewRef.current.removeOverlay(this.overlay);

    this.overlay.viewfinder.frameColor = 'FF000000';
    this.overlay.selectedBrush.stroke.color = '26D482B3';
    this.overlay.selectedBrush.stroke.width = 5;
    this.overlay.aimedBrush.fill.color = 'FFD48255';

    this.viewRef.current.addOverlay(this.overlay);

    // Register a listener to get informed whenever a new barcode got recognized.
    this.barcodeSelection.addListener({
      didUpdateSelection: async (_, session, frame) => {
        
        const barcode = session.newlySelectedBarcodes[0];
        
        if (!barcode) { return }
        
        this.props.barcode.setValue(barcode.data.toString());

        this.viewRef.current?.removeOverlay(this.overlay);
        
        setTimeout(() => { 
          ViewShot.captureRef(this.viewRef, {
            format: "jpg",
            quality: this.props.compressionPercentage.value,
          })
          .then(uri => {
            this.viewRef.current.addOverlay(this.overlay);
            Image.getSize(uri, (width, height) => {
              this.props.width.setValue(width.toString());
              this.props.height.setValue(height.toString());
              this.props.image.setValue(uri);
              executeAction(this.props.onDetect);
              console.warn('Widget finished: ' + barcode.data);
            }, error => {
              console.error("Failed to get image size:", error);
            });
          })
          .catch(error => {
            console.error("Failed to capture view:", error);
          });
        }, 1)
      }
    });

    this.setupSelectionType(this.state.selectionStrategy);
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
    if (previousState.selectionStrategy != this.state.selectionStrategy) {
      this.setupSelectionType(this.state.selectionStrategy);
    }
  }

  setupSelectionType(selectionStrategy) {
    this.barcodeSelectionSettings.selectionType = BarcodeSelectionAimerSelection.aimerSelection;
    this.barcodeSelectionSettings.selectionType.selectionStrategy.type = selectionStrategy;
    this.barcodeSelection.applySettings(this.barcodeSelectionSettings);
  }

  render() {
    return (
      <>
        <DataCaptureView style={{ flex: 1 }} context={this.dataCaptureContext} ref={this.viewRef}>
          <KeepAwake />
        </DataCaptureView>

        <SafeAreaView style={{ width: '100%', backgroundColor: "black", flexDirection: "row", justifyContent: "space-around", alignItems: 'center' }}>
          <TouchableWithoutFeedback onPress={() => this.setState({ selectionStrategy: SelectionStrategy.manual })}>
            <Text style={{ padding: 15, color: this.state.selectionStrategy == SelectionStrategy.manual ? 'white' : 'grey' }}>Tap to scan</Text>
          </TouchableWithoutFeedback>
          <TouchableWithoutFeedback onPress={() => this.setState({ selectionStrategy: SelectionStrategy.auto })}>
            <Text style={{ padding: 15, color: this.state.selectionStrategy == SelectionStrategy.auto ? 'white' : 'grey' }}>Aim to scan</Text>
          </TouchableWithoutFeedback>
        </SafeAreaView>
      </>
    );
  };
}
export { ScanditSelectScan };