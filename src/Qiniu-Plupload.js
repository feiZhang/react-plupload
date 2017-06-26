import _ from 'lodash';
import React from 'react';
import { Button,Progress,Icon } from 'antd'

let count = 0;
const EVENTS = [
  'PostInit', 'Browse', 'Refresh', 'StateChanged', 'QueueChanged', 'OptionChanged',
  'BeforeUpload', 'UploadProgress', 'FileFiltered', 'FilesAdded', 'FilesRemoved', 'FileUploaded', 'ChunkUploaded',
  'UploadComplete', 'Destroy', 'Error'
];

module.exports = React.createFactory(React.createClass({
  displayName: 'QiniuPlupload',
  propTypes: {
    'onPostInit': React.PropTypes.func,
    'onBrowse': React.PropTypes.func,
    'onRefresh': React.PropTypes.func,
    'onStateChanged': React.PropTypes.func,
    'onQueueChanged': React.PropTypes.func,
    'onOptionChanged': React.PropTypes.func,
    'onBeforeUpload': React.PropTypes.func,
    'onUploadProgress': React.PropTypes.func,
    'onFileFiltered': React.PropTypes.func,
    'onFilesAdded': React.PropTypes.func,
    'onFilesRemoved': React.PropTypes.func,
    'onFileUploaded': React.PropTypes.func,
    'onChunkUploaded': React.PropTypes.func,
    'onUploadComplete': React.PropTypes.func,
    'onDestroy': React.PropTypes.func,
    'onError': React.PropTypes.func,
    'id': React.PropTypes.string.isRequired,
    'buttonSelect': React.PropTypes.string,
    'buttonUpload': React.PropTypes.string,
    'autoUpload': React.PropTypes.bool
  },
  id: new Date().valueOf(),
  getInitialState() {
    return {files: [], uploadState: false, progress: {}};
  },

  checkUploader() {
    return window.plupload !== undefined;
  },

  runUploader() {
    console.log(2323,'runuploader')
    const self = this;
    this.initUploader();

    EVENTS.forEach(function(event) {
      const handler = self.props['on' + event];
      if (typeof handler === 'function') {
        self.uploader.bind(event, handler);
      }
    });

    // Put the selected files into the current state
    this.uploader.bind('FilesAdded', (up, files) => {
      if (_.get(self.props, 'multi_selection') === false) {
        self.clearAllFiles();
      } else {
        self.clearFailedFiles();
      }

      const f = self.state.files;
      _.map(files, (file) => {
        f.push(file);
      });
      self.setState({files: f}, ()=> {
        if (self.props.autoUpload === true) {
          self.uploader.start();
        }
      });
    });

    this.uploader.bind('FilesRemoved', (up, rmFiles) => {
      const stateFiles = self.state.files;
      const files = _.filter(stateFiles, (file) => {
        console.log(rmFiles, file);
        return -1 !== _.find(rmFiles, {id: file.id});
      });
      self.setState({files: files});
    });

    this.uploader.bind('StateChanged', (up) => {
      if (up.state === window.plupload.STARTED && self.state.uploadState === false) {
        self.setState({uploadState: true});
      }
      if (up.state !== window.plupload.STARTED && self.state.uploadState === true) {
        self.setState({uploadState: false});
      }
    });

    this.uploader.bind('FileUploaded', (up, file) => {
      const stateFiles = self.state.files;
      _.map(stateFiles, (val, key) => {
        if (val.id === file.id) {
          val.uploaded = true;
          stateFiles[key] = val;
        }
      });
      self.setState({files: stateFiles}, () => {
        self.removeFile(file.id);
      });
    });

    this.uploader.bind('Error', (up, err) => {
      if (_.isUndefined(err.file) !== true) {
        const stateFiles = self.state.files;
        _.map(stateFiles, (val, key) => {
          if (val.id === err.file.id) {
            val.error = err;
            stateFiles[key] = val;
          }
        });
        self.setState({files: stateFiles});
      }
    });

    this.uploader.bind('UploadProgress', (up, file) => {
      const stateProgress = self.state.progress;
      stateProgress[file.id] = file.percent;
      self.setState({progress: stateProgress});
    });
  },

  componentDidMount() {
    const self = this;
    if(this.checkUploader()) {
      this.runUploader();
    } else {
      setTimeout(function() {
        if(self.checkUploader()) {
          self.runUploader();
        } else {
          console.warn('Plupload has not initialized');
        }
      }, 500);
    }
  },

  componentDidUpdate() {
    if(this.checkUploader()) {
      this.refresh();
    }
  },

  getComponentId() {
    return this.props.id || 'react_plupload_' + this.id;
  },

  refresh() {
    // Refresh to append events to buttons again.
    this.uploader.refresh();
  },

  initUploader() {
    console.log(111,this.props);
    this.uploader = Qiniu.uploader(_.extend({
      container:  'container' + this.id,
      runtimes: 'html5',
      multipart: true,
      chunk_size: '4mb',
      dragdrop: true,
      browse_button: this.getComponentId(),
      url: '/upload',
      flash_swf_url: '/plupload-2.1.8/js/Moxie.swf',
      get_new_uptoken: false,
      log_level: 5,
      unique_names: false,
      save_key: true,
      init:{}
    }, this.props));
  },

  // Display selected files
  list() {
    const self = this;
    return _.map(this.state.files, (val) => {

      const removeFile = (e) => {
        e.preventDefault();
        self.removeFile(val.id);
      };
      let delButton = '';
      if (self.state.uploadState === false && val.uploaded !== true) {
        delButton = <Icon type="delete" onClick={removeFile} />
      }

      let progressBar = '';
      if (self.state.uploadState === true && val.uploaded !== true && _.isUndefined(val.error)) {
        const percent = self.state.progress[val.id] || 0;
        progressBar = <Progress percent={percent} status="active" />
      }

      let errorDiv = '';
      if (!_.isUndefined(val.error)) {
        errorDiv = React.createElement('div', {className: 'alert alert-danger'}, 'Error: ' + val.error.code + ', Message: ' + val.error.message);
      }

      let bgSuccess = '';
      if (!_.isUndefined(val.uploaded)) {
        bgSuccess = 'bg-success';
      }

      return React.createElement('li', {key: val.id},
        React.createElement('p', {className: bgSuccess}, val.name, ' ', delButton), progressBar, errorDiv
      );
    });
  },

  clearAllFiles() {
    _.filter(this.state.files, (file) => {
      this.uploader.removeFile(file.id);
    });
  },

  clearFailedFiles() {
    _.filter(this.state.files, (file) => {
      if (file.error) {
        this.uploader.removeFile(file.id);
      }
      return !file.error;
    });
  },

  removeFile(id) {
    this.uploader.removeFile(id);
    _.filter(this.state.files, (file) => {
      return file.id !== id;
    });
  },

  doUpload(e) {
    e.preventDefault();
    this.uploader.start();
  },

  render() {
    const list = this.list();
    const liulanId = this.getComponentId();
    const liulanTitle = this.props.buttonSelect || 'Browse';
    return React.createElement('div', {className: 'my-list', id: 'container' + this.id},
      React.createElement('ul', {className: 'list-unstyled'}, list),
      <Button id={liulanId}>{liulanTitle}</Button>
    );
  }
}));
