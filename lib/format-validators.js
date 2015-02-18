'use string';

/**
 * Source: https://github.com/geraintluff/tv4/issues/100
 */


var valDateTime = function(data, schema) {
  // A string instance is valid against this attribute if it is a valid date
  // representation as defined by RFC 3339, section 5.6 [RFC3339].
  // Based on http://stackoverflow.com/questions/11318634/how-to-convert-date-in-rfc-3339-to-the-javascript-date-objectmilliseconds-since
  var getDom = function(month, year) {
    var domTable = [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];

    if(month == 2) {
      if((year % 4 == 0) && ((year % 100 != 0) || (year % 400 == 0))) {
        domTable[month-1] = 29;
      }
    }

    return(domTable[month-1]);
  };

  var matchDateRegEx = /^([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):([0-4][0-9]|5[0-9]):([0-5][0-9]|60)(\.[0-9]+)?(Z|([+-][01][0-9]|2[0-3]):([0-4][0-9]|5[0-9]))$/;

  try {
    var m = matchDateRegEx.exec(data);
    if(!m) { throw 'failed to match regex'; }
    var year   = +m[1];     // 4DIGIT : Any 4 digits
    var month  = +m[2];     // 2DIGIT : 01-12
    var day    = +m[3];     // 2DIGIT : 01-28, 01-29, 01-30, 01-31
    if(day > getDom(month, year)) { throw 'invalid number of days for month'; }
    var hour   = +m[4];     // 2DIGIT : 00-23
    var minute = +m[5];     // 2DIGIT : 00-59
    var second = +m[6];     // 2DIGIT : 00-58, 00-59, 00-60 based on leap second rules
    var msec   = +m[7];     // 1*DIGIT: (optional)
    var tzHour = +m[8];     // 2DIGIT : 00-23
    var tzMin  = +m[9];     // 2DIGIT : 00-59

    return(null);
  }
  catch(e) {
    return('Invalid data for format date-time: ' + e);
  }
};

var valEmail = function(data, schema) {
  // A string instance is valid against this attribute if it is a valid Internet
  // email address as defined by RFC 5322, section 3.4.1 [RFC5322]
  try {
    var parts = data.split('@');
    if(!parts || (parts.length != 2)) {
      throw 'wrong number of @';
    }

    // local-part regex from http://www.regular-expressions.info/email.html
    if(!parts[0].match(/^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")$/)) {
      // This fixes broken highlighting in sublime caused by the above regex '
      throw 'local-part failed validation';
    }

    if(valHostname(parts[1], schema)) {
      throw 'hostname failed validation';
    }
  }
  catch(e) {
    return('Invalid data for format email: ' + e);
  }
};

var valHostname = function(data, schema) {
  // A string instance is valid against this attribute if it is a valid
  // representation for an Internet host name, as defined by
  // RFC 1034, section 3.1 [RFC1034].
  try {
    // Total length not > 255
    if(data.length > 255) { throw 'length too long'; }

    var parts = data.split(".");
    for(pidx in parts) {
      var p = parts[pidx];

      // Leading character [a-z]
      // Optionally [0-9a-z-] upto 61 times
      // Trailing character [0-9a-z]
      if(!p.toLowerCase().match(/^([0-9a-z]|([0-9a-z][0-9a-z-]{0,61}[a-z0-9]))$/)) {
        throw 'invalid label: ' + p
      }
    }

    return(null);
  }
  catch(e) {
    return('Invalid data for format hostname: ' + e);
  }
};

var valIpv4 = function(data, schema) {
  // A string instance is valid against this attribute if it is a valid
  // representation of an IPv4 address according to the "dotted-quad" ABNF
  // syntax as defined in RFC 2673, section 3.2 [RFC2673].
  // dotted-quad      =  decbyte "." decbyte "." decbyte "." decbyte
  // decbyte          =  1*3DIGIT
  // Each number represented by a <decbyte> must be between 0 and 255, inclusive.
  if(data.match(/^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/)) {
    return(null);
  }

  return('Invalid data for format ipv4');
};

var valIpv6 = function(data, schema) {
  // A string instance is valid against this attribute if it is a valid representation
  // of an IPv6 address as defined in RFC 2373, section 2.2 [RFC2373].

  // Replace :: with 0 sections to get to a basic version
  if(data.match(/::/)) {
    var tgtColon = 7;
    // If we have an IPv4 compat version the target number of : is 6
    if(data.match(/((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/)) {
      tgtColon = 6;
    }

    // Handle :: at beginning/end of data
    if(data.match(/^::/)) {
      data = data.replace('::', '0::');
    }
    if(data.match(/::$/)) {
      data = data.replace('::', '::0');
    }

    // Expand ::
    while(data.match(/:/g).length < tgtColon) {
      data = data.replace('::', ':0::');
    }

    // Replace final ::
    data = data.replace('::', ':0:');
  }

  // The basic version is x:x:x:x:x:x:x:x
  if(data.match(/^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/)) {
    return(null);
  }

  // The IPv4 compat version x:x:x:x:x:x:d.d.d.d
  if(data.match(/^([0-9a-fA-F]{1,4}:){6}((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/)) {
    return(null);
  }

  return('Invalid data for format ipv6');
};

var valUri = function(data, schema) {
  // A string instance is valid against this attribute if it is a valid URI, according to [RFC3986].
  // From http://xml.resource.org/public/rfc/html/rfc3986.html#regexp
  if(data.match(/^(([^:\/?#]+):)?(\/\/([^\/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/)) {
    return(null);
  }

  //var parts = data.match(/^(([^:\/?#]+):)?(\/\/([^\/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/);

  //var cmpnts = {
  //      scheme: parts[2],
  //      authority: parts[4],
  //      path: parts[5],
  //      query: parts[7],
  //      fragment: parts[9]
  //};

  //var comp = '';
  //if(cmpnts.scheme) {   comp += cmpnts.scheme + ':'; }
  //if(cmpnts.authority) {        comp += '//' + cmpnts.authority; }
  //                      comp += cmpnts.path;
  //if(cmpnts.query) {    comp += '?' + cmpnts.query; }
  //if(cmpnts.fragment) { comp += '#' + cmpnts.fragment; }

  //return(null);

  return('Invalid data for format uri');
};

var valUUID = function (data, schema) {
  if(data && (!data.match || !data.match(/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/))) {
    return 'Invalid UUID: ' + data;
  }
};

var valHex = function (data) {
  if(data && (!data.match || !data.match(/^[a-f\d]+$/))) {
    return 'Invalid hex: ' + data;
  }
}

module.exports = ({
  'date-time': valDateTime,
  email: valEmail,
  hostname: valHostname,
  ipv4: valIpv4,
  ipv6: valIpv6,
  uri: valUri,
  uuid: valUUID,
  hex: valHex
});
