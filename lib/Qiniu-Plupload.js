'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _antd = require('antd');

var count = 0;
var EVENTS = ['PostInit', 'Browse', 'Refresh', 'StateChanged', 'QueueChanged', 'OptionChanged', 'BeforeUpload', 'UploadProgress', 'FileFiltered', 'FilesAdded', 'FilesRemoved', 'FileUploaded', 'ChunkUploaded', 'UploadComplete', 'Destroy', 'Error'];

module.exports = _react2['default'].createFactory(_react2['default'].createClass({
  displayName: 'QiniuPlupload',
  propTypes: {
    'onPostInit': _react2['default'].PropTypes.func,
    'onBrowse': _react2['default'].PropTypes.func,
    'onRefresh': _react2['default'].PropTypes.func,
    'onStateChanged': _react2['default'].PropTypes.func,
    'onQueueChanged': _react2['default'].PropTypes.func,
    'onOptionChanged': _react2['default'].PropTypes.func,
    'onBeforeUpload': _react2['default'].PropTypes.func,
    'onUploadProgress': _react2['default'].PropTypes.func,
    'onFileFiltered': _react2['default'].PropTypes.func,
    'onFilesAdded': _react2['default'].PropTypes.func,
    'onFilesRemoved': _react2['default'].PropTypes.func,
    'onFileUploaded': _react2['default'].PropTypes.func,
    'onChunkUploaded': _react2['default'].PropTypes.func,
    'onUploadComplete': _react2['default'].PropTypes.func,
    'onDestroy': _react2['default'].PropTypes.func,
    'onError': _react2['default'].PropTypes.func,
    'id': _react2['default'].PropTypes.string.isRequired,
    'buttonSelect': _react2['default'].PropTypes.string,
    'buttonUpload': _react2['default'].PropTypes.string,
    'autoUpload': _react2['default'].PropTypes.bool
  },
  id: new Date().valueOf(),
  getInitialState: function getInitialState() {
    return { files: [], uploadState: false, progress: {} };
  },

  checkUploader: function checkUploader() {
    return window.plupload !== undefined;
  },

  runUploader: function runUploader() {
    console.log(2323, 'runuploader');
    var self = this;
    this.initUploader();

    EVENTS.forEach(function (event) {
      var handler = self.props['on' + event];
      if (typeof handler === 'function') {
        self.uploader.bind(event, handler);
      }
    });

    // Put the selected files into the current state
    this.uploader.bind('FilesAdded', function (up, files) {
      if (_lodash2['default'].get(self.props, 'multi_selection') === false) {
        self.clearAllFiles();
      } else {
        self.clearFailedFiles();
      }

      var f = self.state.files;
      _lodash2['default'].map(files, function (file) {
        f.push(file);
      });
      self.setState({ files: f }, function () {
        if (self.props.autoUpload === true) {
          self.uploader.start();
        }
      });
    });

    this.uploader.bind('FilesRemoved', function (up, rmFiles) {
      var stateFiles = self.state.files;
      var files = _lodash2['default'].filter(stateFiles, function (file) {
        console.log(rmFiles, file);
        return -1 !== _lodash2['default'].find(rmFiles, { id: file.id });
      });
      self.setState({ files: files });
    });

    this.uploader.bind('StateChanged', function (up) {
      if (up.state === window.plupload.STARTED && self.state.uploadState === false) {
        self.setState({ uploadState: true });
      }
      if (up.state !== window.plupload.STARTED && self.state.uploadState === true) {
        self.setState({ uploadState: false });
      }
    });

    this.uploader.bind('FileUploaded', function (up, file) {
      var stateFiles = self.state.files;
      _lodash2['default'].map(stateFiles, function (val, key) {
        if (val.id === file.id) {
          val.uploaded = true;
          stateFiles[key] = val;
        }
      });
      self.setState({ files: stateFiles }, function () {
        self.removeFile(file.id);
      });
    });

    this.uploader.bind('Error', function (up, err) {
      if (_lodash2['default'].isUndefined(err.file) !== true) {
        (function () {
          var stateFiles = self.state.files;
          _lodash2['default'].map(stateFiles, function (val, key) {
            if (val.id === err.file.id) {
              val.error = err;
              stateFiles[key] = val;
            }
          });
          self.setState({ files: stateFiles });
        })();
      }
    });

    this.uploader.bind('UploadProgress', function (up, file) {
      var stateProgress = self.state.progress;
      stateProgress[file.id] = file.percent;
      self.setState({ progress: stateProgress });
    });
  },

  componentDidMount: function componentDidMount() {
    var self = this;
    if (this.checkUploader()) {
      this.runUploader();
    } else {
      setTimeout(function () {
        if (self.checkUploader()) {
          self.runUploader();
        } else {
          console.warn('Plupload has not initialized');
        }
      }, 500);
    }
  },

  componentDidUpdate: function componentDidUpdate() {
    if (this.checkUploader()) {
      this.refresh();
    }
  },

  getComponentId: function getComponentId() {
    return this.props.id || 'react_plupload_' + this.id;
  },

  refresh: function refresh() {
    // Refresh to append events to buttons again.
    this.uploader.refresh();
  },

  initUploader: function initUploader() {
    console.log(111, this.props);
    this.uploader = Qiniu.uploader(_lodash2['default'].extend({
      container: 'container' + this.id,
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
      init: {}
    }, this.props));
  },

  // Display selected files
  list: function list() {
    var self = this;
    return _lodash2['default'].map(this.state.files, function (val) {

      var removeFile = function removeFile(e) {
        e.preventDefault();
        self.removeFile(val.id);
      };
      var delButton = '';
      if (self.state.uploadState === false && val.uploaded !== true) {
        delButton = _react2['default'].createElement(_antd.Icon, { type: 'delete', onClick: removeFile });
      }

      var progressBar = '';
      if (self.state.uploadState === true && val.uploaded !== true && _lodash2['default'].isUndefined(val.error)) {
        var percent = self.state.progress[val.id] || 0;
        progressBar = _react2['default'].createElement(_antd.Progress, { percent: percent, status: 'active' });
      }

      var errorDiv = '';
      if (!_lodash2['default'].isUndefined(val.error)) {
        errorDiv = _react2['default'].createElement('div', { className: 'alert alert-danger' }, 'Error: ' + val.error.code + ', Message: ' + val.error.message);
      }

      var bgSuccess = '';
      if (!_lodash2['default'].isUndefined(val.uploaded)) {
        bgSuccess = 'bg-success';
      }

      return _react2['default'].createElement('li', { key: val.id }, _react2['default'].createElement('p', { className: bgSuccess }, val.name, ' ', delButton), progressBar, errorDiv);
    });
  },

  clearAllFiles: function clearAllFiles() {
    var _this = this;

    _lodash2['default'].filter(this.state.files, function (file) {
      _this.uploader.removeFile(file.id);
    });
  },

  clearFailedFiles: function clearFailedFiles() {
    var _this2 = this;

    _lodash2['default'].filter(this.state.files, function (file) {
      if (file.error) {
        _this2.uploader.removeFile(file.id);
      }
      return !file.error;
    });
  },

  removeFile: function removeFile(id) {
    this.uploader.removeFile(id);
    _lodash2['default'].filter(this.state.files, function (file) {
      return file.id !== id;
    });
  },

  doUpload: function doUpload(e) {
    e.preventDefault();
    this.uploader.start();
  },

  render: function render() {
    var list = this.list();
    var liulanId = this.getComponentId();
    var liulanTitle = this.props.buttonSelect || 'Browse';
    return _react2['default'].createElement('div', { className: 'my-list', id: 'container' + this.id }, _react2['default'].createElement('ul', { className: 'list-unstyled' }, list), _react2['default'].createElement(
      _antd.Button,
      { id: liulanId },
      liulanTitle
    ));
  }
}));