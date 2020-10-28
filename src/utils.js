import vtkITKHelper from 'vtk.js/Sources/Common/DataModel/ITKHelper'
import vtkCoordinate from 'vtk.js/Sources/Rendering/Core/Coordinate'
import vtk from 'vtk.js/Sources/vtk'
import PixelTypes from 'itk/PixelTypes'

export { readFiles } from './IO/processFiles'
export { vtkITKHelper }
export { vtkCoordinate }
export { vtk }

import IntTypes from 'itk/IntTypes'
import FloatTypes from 'itk/FloatTypes'
import IOTypes from 'itk/IOTypes'
import runPipelineBrowser from 'itk/runPipelineBrowser'
import WorkerPool from 'itk/WorkerPool'
const cores = navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4
const numberOfWorkers = cores + Math.floor(Math.sqrt(cores))
const workerPool = new WorkerPool(numberOfWorkers, runPipelineBrowser)

export async function convertToItkImage(image) {
  if (image.data) {
    return image
  }
  let byteArray
  if (image.compressedData instanceof ArrayBuffer)
    byteArray = new Uint8Array(image.compressedData)
  else byteArray = new Uint8Array(image.compressedData.buffer)
  const reducer = (accumulator, currentValue) => accumulator * currentValue
  const pixelCount = image.size.reduce(reducer, 1)
  let componentSize = null
  switch (image.imageType.componentType) {
    case IntTypes.Int8:
      componentSize = 1
      break
    case IntTypes.UInt8:
      componentSize = 1
      break
    case IntTypes.Int16:
      componentSize = 2
      break
    case IntTypes.UInt16:
      componentSize = 2
      break
    case IntTypes.Int32:
      componentSize = 4
      break
    case IntTypes.UInt32:
      componentSize = 4
      break
    case IntTypes.Int64:
      componentSize = 8
      break
    case IntTypes.UInt64:
      componentSize = 8
      break
    case FloatTypes.Float32:
      componentSize = 4
      break
    case FloatTypes.Float64:
      componentSize = 8
      break
    default:
      console.error(
        'Unexpected component type: ' + image.imageType.componentType
      )
  }
  const numberOfBytes = pixelCount * image.imageType.components * componentSize
  const pipelinePath = 'ZstdDecompress'
  const args = ['input.bin', 'output.bin', String(numberOfBytes)]
  const desiredOutputs = [
    {
      path: 'output.bin',
      type: IOTypes.Binary,
    },
  ]
  const inputs = [
    {
      path: 'input.bin',
      type: IOTypes.Binary,
      data: byteArray,
    },
  ]
  console.log(`input MB: ${byteArray.length / 1000 / 1000}`)
  console.log(`output MB: ${numberOfBytes / 1000 / 1000}`)
  const compressionAmount = byteArray.length / numberOfBytes
  console.log(`compression amount: ${compressionAmount}`)
  const t0 = performance.now()
  const taskArgsArray = [[pipelinePath, args, desiredOutputs, inputs]]
  const results = await workerPool.runTasks(taskArgsArray)
  const t1 = performance.now()
  const duration = Number(t1 - t0)
    .toFixed(1)
    .toString()
  console.log('decompression took ' + duration + ' milliseconds.')

  const decompressed = results[0].outputs[0].data
  switch (image.imageType.componentType) {
    case IntTypes.Int8:
      image.data = new Int8Array(decompressed.buffer)
      break
    case IntTypes.UInt8:
      image.data = decompressed
      break
    case IntTypes.Int16:
      image.data = new Int16Array(decompressed.buffer)
      break
    case IntTypes.UInt16:
      image.data = new Uint16Array(decompressed.buffer)
      break
    case IntTypes.Int32:
      image.data = new Int32Array(decompressed.buffer)
      break
    case IntTypes.UInt32:
      image.data = new Uint32Array(decompressed.buffer)
      break
    case IntTypes.Int64:
      image.data = new BigUint64Array(decompressed.buffer)
      break
    case IntTypes.UInt64:
      image.data = new BigUint64Array(decompressed.buffer)
      break
    case FloatTypes.Float32:
      image.data = new Float32Array(decompressed.buffer)
      break
    case FloatTypes.Float64:
      image.data = new Float64Array(decompressed.buffer)
      break
    default:
      console.error(
        'Unexpected component type: ' + image.imageType.componentType
      )
  }
  delete image.compressedData
  return image
}

export function decompressDataValue(polyData, prop) {
  if (!polyData.hasOwnProperty(prop)) {
    return Promise.resolve(polyData)
  }
  const byteArray = new Uint8Array(polyData[prop].compressedValues.buffer)
  const elementSize = DataTypeByteSize[polyData[prop].dataType]
  const numberOfBytes = polyData[prop].size * elementSize
  const pipelinePath = 'ZstdDecompress'
  const args = ['input.bin', 'output.bin', String(numberOfBytes)]
  const desiredOutputs = [
    {
      path: 'output.bin',
      type: IOTypes.Binary,
    },
  ]
  const inputs = [
    {
      path: 'input.bin',
      type: IOTypes.Binary,
      data: byteArray,
    },
  ]
  console.log(`${prop} input MB: ${byteArray.length / 1000 / 1000}`)
  console.log(`${prop} output MB: ${numberOfBytes / 1000 / 1000}`)
  const compressionAmount = byteArray.length / numberOfBytes
  console.log(`${prop} compression amount: ${compressionAmount}`)
  const t0 = performance.now()
  return runPipelineBrowser(
    null,
    pipelinePath,
    args,
    desiredOutputs,
    inputs
  ).then(function({ stdout, stderr, outputs, webWorker }) {
    webWorker.terminate()
    const t1 = performance.now()
    const duration = Number(t1 - t0)
      .toFixed(1)
      .toString()
    console.log(`${prop} decompression took ${duration} milliseconds.`)
    polyData[prop].values = new window[polyData[prop].dataType](
      outputs[0].data.buffer
    )

    return polyData
  })
}

export async function decompressPolyData(polyData) {
  const props = ['points', 'verts', 'lines', 'polys', 'strips']
  const decompressedProps = []
  const taskArgsArray = []
  for (let index = 0; index < props.length; index++) {
    const prop = props[index]
    if (!polyData.hasOwnProperty(prop)) {
      continue
    }
    const byteArray = new Uint8Array(polyData[prop].compressedValues.buffer)
    const elementSize = DataTypeByteSize[polyData[prop].dataType]
    const numberOfBytes = polyData[prop].size * elementSize
    const pipelinePath = 'ZstdDecompress'
    const args = ['input.bin', 'output.bin', String(numberOfBytes)]
    const desiredOutputs = [
      {
        path: 'output.bin',
        type: IOTypes.Binary,
      },
    ]
    const inputs = [
      {
        path: 'input.bin',
        type: IOTypes.Binary,
        data: byteArray,
      },
    ]
    console.log(`${prop} input MB: ${byteArray.length / 1000 / 1000}`)
    console.log(`${prop} output MB: ${numberOfBytes / 1000 / 1000}`)
    const compressionAmount = byteArray.length / numberOfBytes
    console.log(`${prop} compression amount: ${compressionAmount}`)
    taskArgsArray.push([pipelinePath, args, desiredOutputs, inputs])
    decompressedProps.push(prop)
  }

  const decompressedPointData = []
  if (polyData.hasOwnProperty('pointData')) {
    const pointDataArrays = polyData.pointData.arrays
    for (let index = 0; index < pointDataArrays.length; index++) {
      const array = pointDataArrays[index]
      const byteArray = new Uint8Array(array.data.compressedValues.buffer)
      const elementSize = DataTypeByteSize[array.data.dataType]
      const numberOfBytes = array.data.size * elementSize
      const pipelinePath = 'ZstdDecompress'
      const args = ['input.bin', 'output.bin', String(numberOfBytes)]
      const desiredOutputs = [
        {
          path: 'output.bin',
          type: IOTypes.Binary,
        },
      ]
      const inputs = [
        {
          path: 'input.bin',
          type: IOTypes.Binary,
          data: byteArray,
        },
      ]
      console.log(`${array} input MB: ${byteArray.length / 1000 / 1000}`)
      console.log(`${array} output MB: ${numberOfBytes / 1000 / 1000}`)
      const compressionAmount = byteArray.length / numberOfBytes
      console.log(`${array} compression amount: ${compressionAmount}`)
      taskArgsArray.push([pipelinePath, args, desiredOutputs, inputs])
      decompressedPointData.push(array)
    }
  }

  const decompressedCellData = []
  if (polyData.hasOwnProperty('cellData')) {
    const cellDataArrays = polyData.cellData.arrays
    for (let index = 0; index < cellDataArrays.length; index++) {
      const array = cellDataArrays[index]
      const byteArray = new Uint8Array(array.data.compressedValues.buffer)
      const elementSize = DataTypeByteSize[array.data.dataType]
      const numberOfBytes = array.data.size * elementSize
      const pipelinePath = 'ZstdDecompress'
      const args = ['input.bin', 'output.bin', String(numberOfBytes)]
      const desiredOutputs = [
        {
          path: 'output.bin',
          type: IOTypes.Binary,
        },
      ]
      const inputs = [
        {
          path: 'input.bin',
          type: IOTypes.Binary,
          data: byteArray,
        },
      ]
      console.log(`${array} input MB: ${byteArray.length / 1000 / 1000}`)
      console.log(`${array} output MB: ${numberOfBytes / 1000 / 1000}`)
      const compressionAmount = byteArray.length / numberOfBytes
      console.log(`${array} compression amount: ${compressionAmount}`)
      taskArgsArray.push([pipelinePath, args, desiredOutputs, inputs])
      decompressedCellData.push(array)
    }
  }
}

const numpy2vtkType = {
  int8: {
    componentType: 'int8_t',
    arrayType: Int8Array,
  },
  uint8: {
    componentType: 'uint8_t',
    arrayType: Uint8Array,
  },
  int16: {
    componentType: 'int16_t',
    arrayType: Int16Array,
  },
  uint16: {
    componentType: 'uint16_t',
    arrayType: Uint16Array,
  },
  int32: {
    componentType: 'int32_t',
    arrayType: Int32Array,
  },
  uint32: {
    componentType: 'uint32_t',
    arrayType: Uint32Array,
  },
  float32: {
    componentType: 'float',
    arrayType: Float32Array,
  },
  float64: {
    componentType: 'double',
    arrayType: Float64Array,
  },
}

export function ndarrayToItkImage(array) {
  if (array._rtype !== 'ndarray') {
    throw new Error('Invalid ndarray type: ' + array._rtype)
  }
  const { componentType, arrayType } = numpy2vtkType[array._rdtype]
  if (
    array._rshape.length === 2 ||
    (array._rshape.length == 3 && array._rshape[2] <= 4)
  ) {
    const channels = array._rshape.length === 3 ? array._rshape[2] : 1
    const pixelType =
      channels === 1 ? PixelTypes.Scalar : PixelTypes.VariableLengthVector
    return {
      imageType: {
        dimension: 2,
        pixelType,
        componentType,
        components: channels,
      },
      name: 'Image',
      origin: [0.0, 0.0],
      spacing: [1.0, 1.0],
      direction: {
        data: [1.0, 0.0, 0.0, 1.0],
      },
      size: [array._rshape[1], array._rshape[0]],
      data: new arrayType(array._rvalue),
    }
  } else if (array._rshape.length === 3) {
    return {
      imageType: {
        dimension: 3,
        pixelType: PixelTypes.Scalar,
        componentType,
        components: 1,
      },
      name: 'Volume',
      origin: [0.0, 0.0, 0.0],
      spacing: [1.0, 1.0, 1.0],
      direction: {
        data: [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0],
      },
      size: [array._rshape[2], array._rshape[1], array._rshape[0]],
      data: new arrayType(array._rvalue),
    }
  } else if (array._rshape.length === 4) {
    return {
      imageType: {
        dimension: 3,
        pixelType: PixelTypes.Scalar,
        componentType,
        components: array._rshape[3],
      },
      name: 'Volume',
      origin: [0.0, 0.0, 0.0],
      spacing: [1.0, 1.0, 1.0],
      direction: {
        data: [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0],
      },
      size: [array._rshape[2], array._rshape[1], array._rshape[0]],
      data: new arrayType(array._rvalue),
    }
  } else {
    throw new Error(`Unsupported shape: ${array._rshape}`)
  }
}
