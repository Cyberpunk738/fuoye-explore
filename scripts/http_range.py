"""Small seekable HTTPS range reader for rasterio's Python opener.

Uses Python's normal certificate verification and fetches only requested blocks.
Useful on hosts where GDAL/libcurl and Python use different CA installations.
"""
import io
import urllib.request

class HTTPRangeReader(io.RawIOBase):
    BLOCK = 64 * 1024

    def __init__(self, url, cache=None):
        super().__init__()
        self.url = url
        self.position = 0
        self.cache = cache if cache is not None else {}
        with urllib.request.urlopen(urllib.request.Request(url, headers={'Range':'bytes=0-0'}), timeout=30) as response:
            content_range = response.headers.get('Content-Range', '')
            if response.status != 206 or '/' not in content_range:
                raise OSError('Server must support bounded HTTP range reads')
            self.size = int(content_range.rsplit('/', 1)[1])

    def readable(self): return True
    def seekable(self): return True
    def tell(self): return self.position

    def seek(self, offset, whence=io.SEEK_SET):
        if whence not in (io.SEEK_SET, io.SEEK_CUR, io.SEEK_END): raise ValueError('Invalid seek mode')
        position = offset if whence == io.SEEK_SET else self.position+offset if whence == io.SEEK_CUR else self.size+offset
        if position < 0: raise ValueError('Negative seek position')
        self.position = position
        return position

    def read(self, size=-1):
        if self.closed: raise ValueError('Reader closed')
        size = min(self.size-self.position, size if size >= 0 else self.size-self.position)
        if size <= 0: return b''
        if size > 8*1024*1024: raise OSError('Refusing an unbounded raster download; request a window')
        end = self.position+size
        output = []
        while self.position < end:
            block = self.position//self.BLOCK
            if block not in self.cache:
                start = block*self.BLOCK
                last = min(self.size, start+self.BLOCK)-1
                request = urllib.request.Request(self.url, headers={'Range':f'bytes={start}-{last}'})
                with urllib.request.urlopen(request, timeout=30) as response:
                    expected = f'bytes {start}-{last}/{self.size}'
                    if response.status != 206 or response.headers.get('Content-Range') != expected:
                        raise OSError('Server returned an unexpected byte range')
                    self.cache[block] = response.read(last-start+1)
            data = self.cache[block]
            offset = self.position%self.BLOCK
            length = min(end-self.position, len(data)-offset)
            if length <= 0: raise OSError('Incomplete HTTP range')
            output.append(data[offset:offset+length]);self.position += length
        return b''.join(output)
